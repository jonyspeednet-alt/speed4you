require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { getScannerHealth } = require('./services/scanner');

const { compressionMiddleware, setStaticCacheHeaders } = require('./middleware/response-optimizer');
const { ensureContentStore, closePool } = require('./data/store');
const trackActiveUserMiddleware = require('./middleware/trackActiveUsers');
const { startActiveUserCleanup, stopActiveUserCleanup } = require('./data/store/activeUsers');
const logger = require('./utils/logger');
const checkEnv = require('./config/env-check');

// Validate environment before doing anything else
checkEnv();

const app = express();
const PORT = process.env.PORT || 3001;
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
const isProduction = nodeEnv === 'production';
const corsOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

// The production deployment sits behind a single nginx hop. Limiting trust
// to one proxy avoids express-rate-limit permissive proxy warnings.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

if ((isProduction || process.env.REQUIRE_CORS_ALLOWLIST === '1') && !corsOrigins.length) {
  throw new Error('CORS_ALLOWED_ORIGINS must be configured in production.');
}

function createCorsError() {
  const error = new Error('CORS origin is not allowed');
  error.status = 403;
  return error;
}

function buildCorsOriginChecker() {
  if (!corsOrigins.length) {
    return (origin, callback) => {
      // In development, if no origins are specified, allow all.
      // In production, we'll have already thrown an error if REQUIRE_CORS_ALLOWLIST is 1.
      callback(null, true);
    };
  }

  return (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(createCorsError());
  };
}

function sanitizeScannerHealthForPublic(health) {
  const roots = Array.isArray(health?.roots)
    ? health.roots.map((root) => ({
        id: root.id,
        label: root.label,
        type: root.type,
        exists: root.exists,
        checkable: root.checkable,
        pathStatus: root.pathStatus,
        pathStatusLabel: root.pathStatusLabel,
        estimatedCandidates: root.estimatedCandidates,
        lastCompletedAt: root.lastCompletedAt,
      }))
    : [];

  return {
    checkedAt: health?.checkedAt || new Date().toISOString(),
    totalRoots: Number(health?.totalRoots || 0),
    healthyRoots: Number(health?.healthyRoots || 0),
    brokenRoots: Number(health?.brokenRoots || 0),
    remoteRoots: Number(health?.remoteRoots || 0),
    roots,
    recentRuns: Array.isArray(health?.recentRuns) ? health.recentRuns.slice(0, 5) : [],
    currentJob: health?.currentJob || null,
    metadataCache: health?.metadataCache || {},
  };
}


app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:'],
      workerSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'", ...corsOrigins],
    },
  } : false,
  // Enforce HTTPS in production
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

// Global rate limiter — broad protection against abuse on all API routes
const GLOBAL_API_LIMIT = Number(process.env.GLOBAL_API_RATE_LIMIT_MAX || 5000);
const PUBLIC_API_LIMIT = Number(process.env.PUBLIC_API_RATE_LIMIT_MAX || 20000);
const PUBLIC_API_PER_IP_LIMIT = Number(process.env.PUBLIC_API_PER_IP_LIMIT || 200);

function isLocalRequest(req) {
  return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
}

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: GLOBAL_API_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) =>
    req.path === '/tv/asset'
    || (!isProduction && isLocalRequest(req)),
});


// Stricter per-IP limiter for public content endpoints (prevents a single user from overloading)
const publicContentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: PUBLIC_API_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: isLocalRequest,
});

// Per-IP limiter for public read endpoints (100 req/min per IP)
const publicPerIpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: PUBLIC_API_PER_IP_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from your IP. Please slow down.' },
  skip: isLocalRequest,
});

app.use(compressionMiddleware);
app.use(cors({
  origin: buildCorsOriginChecker(),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
// Enforce Content-Type on mutation endpoints
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.path.startsWith('/upload/')) {
    const ct = (req.headers['content-type'] || '').split(';')[0].trim();
    if (ct && ct !== 'application/json' && ct !== 'multipart/form-data' && ct !== 'application/x-www-form-urlencoded') {
      return res.status(415).json({ error: 'Unsupported Media Type. Use application/json.' });
    }
  }
  next();
});
// Track active users for live count display
app.use(trackActiveUserMiddleware);

// Track active connections and in-flight requests for graceful shutdown
let activeConnections = new Set();
let activeRequests = 0;
let shuttingDown = false;

app.use((req, res, next) => {
  req.requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  res.setHeader('X-Request-Id', req.requestId);

  if (shuttingDown) {
    return res.status(503).json({ error: 'Server is shutting down. Please retry.' });
  }
  activeRequests++;
  res.on('finish', () => { activeRequests--; });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), deploy: 'v6' });
});

app.get('/health/scanner', async (req, res) => {
  const health = await getScannerHealth();
  const includeSensitive = String(process.env.SCANNER_HEALTH_PUBLIC_VERBOSE || '').toLowerCase() === 'true';
  res.json(includeSensitive ? health : sanitizeScannerHealthForPublic(health));
});


// Group API routes to allow mounting at multiple points
const apiRouter = express.Router();
// Coarse global cap for ALL api requests under any mount prefix (/api and
// /portal-api/api) — the /tv/asset endpoint stays exempt for high throughput.
apiRouter.use(globalApiLimiter);
apiRouter.use('/auth', require('./routes/auth'));
apiRouter.use('/content', publicContentLimiter, publicPerIpLimiter, require('./routes/content'));
apiRouter.use('/movies', publicContentLimiter, publicPerIpLimiter, require('./routes/movies'));
apiRouter.use('/series', publicContentLimiter, publicPerIpLimiter, require('./routes/series'));
apiRouter.use('/search', publicContentLimiter, publicPerIpLimiter, require('./routes/search'));
apiRouter.use('/player', require('./routes/player'));
apiRouter.use('/tv', publicContentLimiter, publicPerIpLimiter, require('./routes/tv'));
apiRouter.use('/watchlist', require('./routes/watchlist'));
apiRouter.use('/admin', require('./routes/admin'));
apiRouter.use('/webhook', require('./routes/webhook'));

// Mount at /api (legacy/dev) and /portal-api/api (Vite-configured prefix)
app.use('/api', apiRouter);
app.use('/portal-api/api', apiRouter);

if (fs.existsSync(frontendDistPath)) {
  // Serve static assets from the frontend build
  // Support both the /portal prefix (configured in Vite) and the root
  app.use('/portal', express.static(frontendDistPath, {
    index: false,
    setHeaders: setStaticCacheHeaders,
  }));
  app.use(express.static(frontendDistPath, {
    index: false,
    setHeaders: setStaticCacheHeaders,
  }));

  // Explicitly serve manifest.json before SPA fallback to avoid returning index.html
  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(frontendDistPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(manifestPath);
    } else {
      res.status(404).json({ error: 'manifest.json not found' });
    }
  });

  // Handle SPA routing: serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/portal-api/')) {
      return next();
    }

    // Explicitly handle /health to avoid sending index.html
    if (req.path === '/health' || req.path === '/health/scanner') {
      return next();
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'API route not found',
      },
      requestId: req.requestId || '',
    });
  }

  return next();
});

// Global error handler — never leak stack traces in production
app.use((err, req, res, next) => {
  const isPayloadTooLarge = err?.code === 'LIMIT_FILE_SIZE';
  const statusCode = Number(err.status || err.statusCode || (isPayloadTooLarge ? 413 : 500));

  // Always log the full error server-side
  if (statusCode >= 500) {
    logger.error(`Unhandled error: ${err.message}`, { requestId: req.requestId, stack: err.stack });
  }

  const code = isPayloadTooLarge
    ? 'PAYLOAD_TOO_LARGE'
    : (err.code || (statusCode === 400 ? 'BAD_REQUEST' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'));
  const message = isPayloadTooLarge
    ? 'Uploaded file exceeds configured size limit'
    : (statusCode >= 500 && isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error'));


  res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message,
      details: Array.isArray(err.details) ? err.details : undefined,
      // Never expose stack traces in production
      ...(isProduction ? {} : { stack: err.stack }),
    },
    requestId: req.requestId || '',
  });
});

async function startServer() {
  await ensureContentStore();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${nodeEnv}] (PID: ${process.pid})`);
    startActiveUserCleanup();
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Failed to start server.`);
    } else {
      logger.error('Server error:', { error: error.message });
    }
    process.exit(1);
  });

  // Track connections so we can drain them during shutdown
  server.on('connection', (conn) => {
    activeConnections.add(conn);
    conn.on('close', () => activeConnections.delete(conn));
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    shuttingDown = true;
    stopActiveUserCleanup();

    const forceTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout — force closing');
      for (const conn of activeConnections) {
        conn.destroy();
      }
      process.exit(1);
    }, 30000);
    forceTimeout.unref();

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server stopped listening');
    });

    // Wait for in-flight requests to finish
    while (activeRequests > 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
    logger.info('All active requests completed.');

    // Destroy remaining idle connections
    for (const conn of activeConnections) {
      conn.destroy();
    }

    clearTimeout(forceTimeout);
    try {
      await closePool();
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', { error: err.message });
      process.exit(1);
    }
  };


  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.error('Failed to initialize content store', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;
