# Backend Upgrade Guide - ISP Entertainment Portal

## 📊 Current Backend Status

**Current Version**: v1.1.0  
**Node.js**: 22.x (Latest LTS)  
**Main Server**: Express.js 4.18.2  
**Database**: PostgreSQL (pg 8.11.3)

---

## 🎯 Upgrade Checklist

### Phase 1: Dependencies Audit & Update ✅
- [x] Review all dependencies for updates
- [x] Check security vulnerabilities
- [x] Identify breaking changes

### Phase 2: Code Updates
- [ ] Update all dependencies to latest stable versions
- [ ] Fix any deprecation warnings
- [ ] Update environment configurations
- [ ] Test all API endpoints

### Phase 3: Performance Improvements
- [ ] Add caching strategies
- [ ] Optimize database queries
- [ ] Add request monitoring
- [ ] Implement better error handling

### Phase 4: Security Enhancements
- [ ] Update security headers
- [ ] Add request validation
- [ ] Implement rate limiting improvements
- [ ] Add CSRF protection

---

## 📦 Dependency Upgrade Plan

### Current Dependencies (Newest Available):

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| express | 4.18.2 | 4.21.2 | ✅ Update available |
| pg | 8.11.3 | 8.11.3 | ✅ Latest |
| bcryptjs | 2.4.3 | 2.4.3 | ✅ Latest |
| cors | 2.8.5 | 2.8.5 | ✅ Latest |
| dotenv | 16.3.1 | 17.4.2 | ✅ Update available |
| helmet | 7.1.0 | 8.1.0 | ✅ Update available |
| joi | 17.11.0 | 18.1.2 | ✅ Update available |
| jsonwebtoken | 9.0.2 | 9.0.3 | ✅ Update available |
| morgan | 1.10.0 | 1.10.0 | ✅ Latest |
| multer | 2.1.1 | 1.4.5 | ⚠️ Latest stable (v2 is beta) |
| express-rate-limit | 8.4.0 | 8.4.0 | ✅ Latest |

### Dev Dependencies:

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| nodemon | 3.0.2 | 3.0.2 | ✅ Latest |

---

## 🚀 Step-by-Step Upgrade Instructions

### Step 1: Backup Current State
```bash
# Backup package-lock.json
cp backend/package-lock.json backend/package-lock.json.backup

# Create git branch for upgrade
git checkout -b backend/upgrade-dependencies-2026
```

### Step 2: Update package.json

Run this command in the `backend/` directory:

```bash
cd backend

# Update all dependencies to latest stable versions
npm install express@^4.21.2 \
  dotenv@^17.4.2 \
  helmet@^8.1.0 \
  joi@^18.1.2 \
  jsonwebtoken@^9.0.3 \
  --save
```

### Step 3: Update DevDependencies

```bash
# Optional: Update nodemon (if you use it)
npm install nodemon@^3.1.7 --save-dev
```

### Step 4: Install & Test

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Run tests
npm test

# Start development server
npm run dev
```

### Step 5: Check for Issues

```bash
# Check for security vulnerabilities
npm audit

# Fix auto-fixable vulnerabilities
npm audit fix
```

---

## 🔍 Code Changes Required

### 1. Update Error Handling

**Before:**
```javascript
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});
```

**After:**
```javascript
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  
  res.status(status).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});
```

### 2. Enhanced Environment Configuration

Add to `.env`:
```env
# Backend Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portal_db
DB_USER=portal_user
DB_PASSWORD=secure_password

# Security
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=24h
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Server
TRUST_PROXY_HOPS=1
```

### 3. Add Request Logging Middleware

Create `backend/src/middleware/request-logger.js`:

```javascript
const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom morgan format
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

const morganMiddleware = morgan(
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms ":referrer" ":user-agent"',
  {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }
);

module.exports = morganMiddleware;
```

### 4. Add API Health Check Endpoint

Create `backend/src/routes/health.js`:

```javascript
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
```

---

## 🧪 Testing Checklist

After upgrading, verify:

- [ ] Server starts without errors: `npm run dev`
- [ ] All API endpoints respond correctly
- [ ] Database connections work
- [ ] Authentication (JWT) works
- [ ] File uploads work
- [ ] Rate limiting works
- [ ] CORS is properly configured
- [ ] Error handling works
- [ ] Logs are generated correctly
- [ ] Performance is acceptable

---

## 🔒 Security Hardening

### 1. Update Helmet Configuration

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

### 2. Add Input Validation

```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().max(100).required()
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }
    req.validated = value;
    next();
  };
};

module.exports = { validateRequest, userSchema };
```

### 3. Add Request Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // stricter for sensitive endpoints
  skipSuccessfulRequests: true, // don't count successful requests
});

app.use('/api/', limiter);
app.use('/api/auth/login', strictLimiter);
```

---

## 📈 Performance Optimization

### 1. Add Response Caching

```javascript
const cacheMiddleware = (duration = 3600) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = req.app.locals[key];
    if (cachedBody) {
      res.set('X-From-Cache', 'true');
      res.send(cachedBody);
      return;
    }

    res.sendResponse = res.send;
    res.send = (body) => {
      if (res.statusCode === 200) {
        req.app.locals[key] = body;
        res.set('Cache-Control', `public, max-age=${duration}`);
      }
      res.sendResponse(body);
    };
    next();
  };
};
```

### 2. Database Query Optimization

```javascript
// Use connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add connection monitoring
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});
```

### 3. Add Request Monitoring

```javascript
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
});

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  next();
};

app.use(metricsMiddleware);
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

---

## 🚨 Rollback Plan

If something goes wrong:

```bash
# Restore previous state
git reset --hard HEAD~1

# Or restore node_modules
npm install

# Or use backup
cp backend/package-lock.json.backup backend/package-lock.json
rm -rf backend/node_modules
npm install
```

---

## 📋 Deployment Checklist

- [ ] All tests pass locally
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Performance benchmarks acceptable
- [ ] Code review completed
- [ ] Staging deployment tested
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Team notified of changes
- [ ] Database migrations ready (if needed)
- [ ] Production deployment scheduled

---

## 📞 Support & Troubleshooting

### Common Issues:

1. **Port Already in Use**
   ```bash
   # Find process using port 3001
   lsof -i :3001
   # Kill process
   kill -9 <PID>
   ```

2. **Database Connection Errors**
   ```bash
   # Test connection
   psql -h localhost -U portal_user -d portal_db
   ```

3. **Module Not Found**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Memory Leak**
   ```bash
   # Monitor memory
   node --inspect src/index.js
   # Visit chrome://inspect
   ```

---

## 🎉 Completion

After successful upgrade:
1. Tag the release: `git tag -a v1.2.0 -m "Backend upgrade"`
2. Push tags: `git push origin --tags`
3. Update CHANGELOG.md
4. Notify team of new capabilities

---

**Last Updated**: April 29, 2026  
**Maintained By**: DevOps Team
