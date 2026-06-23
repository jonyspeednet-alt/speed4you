const express = require('express');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

const router = express.Router();

// Reuse TCP connections to upstream TV portal (avoids DNS + handshake overhead per request)
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: TV_REQUEST_TIMEOUT_MS });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: TV_REQUEST_TIMEOUT_MS });

// Simple in-memory LRU cache for proxied upstream assets
const assetCache = new Map();
const ASSET_CACHE_MAX = 500;
const ASSET_CACHE_TTL_MS = 5000; // 5 seconds for segments/playlists
const LOGO_CACHE_TTL_MS = 600000; // 10 minutes for logos
const CHANNELS_CACHE_TTL_MS = 30000; // 30 seconds — channel list rarely changes
const PLAYER_CACHE_TTL_MS = 15000; // 15 seconds — stream source is stable

function cacheGet(key, ttlMs) {
  const entry = assetCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    assetCache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  if (assetCache.size >= ASSET_CACHE_MAX) {
    const oldestKey = assetCache.keys().next().value;
    assetCache.delete(oldestKey);
  }
  assetCache.set(key, { data, ts: Date.now() });
}

const TV_PORTAL_BASE = process.env.TV_PORTAL_BASE_URL || '';
const TV_REQUEST_TIMEOUT_MS = Number(process.env.TV_REQUEST_TIMEOUT_MS || 15000);
const ALLOWED_HOSTS = new Set(
  String(process.env.TV_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
);
const ALLOWED_PORTS = new Set(
  String(process.env.TV_ALLOWED_PORTS || '80,8082,')
    .split(',')
    .map((p) => p.trim()),
);
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
};

function ensureAllowedUrl(input) {
  const targetUrl = new URL(input, TV_PORTAL_BASE);

  if (!ALLOWED_HOSTS.has(targetUrl.hostname) || !ALLOWED_PORTS.has(targetUrl.port || '')) {
    const error = new Error('TV source is not allowed');
    error.status = 400;
    throw error;
  }

  return targetUrl;
}

function requestUrl(targetUrl, redirectCount = 0, method = 'GET') {
  const safeUrl = ensureAllowedUrl(targetUrl);
  const transport = safeUrl.protocol === 'https:' ? https : http;
  const agent = safeUrl.protocol === 'https:' ? httpsAgent : httpAgent;

  return new Promise((resolve, reject) => {
    const request = transport.request(safeUrl, { headers: DEFAULT_HEADERS, method, timeout: TV_REQUEST_TIMEOUT_MS, agent }, (response) => {
      const location = response.headers.location;

      if (location && response.statusCode >= 300 && response.statusCode < 400 && redirectCount < 5) {
        response.resume();
        resolve(requestUrl(new URL(location, safeUrl), redirectCount + 1, method));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 500,
          headers: response.headers,
          body: Buffer.concat(chunks),
          url: safeUrl,
        });
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error(`TV request timed out after ${TV_REQUEST_TIMEOUT_MS}ms`));
    });
    request.end();
  });
}

function parseChannels(html) {
  const categoryMatches = Array.from(html.matchAll(/data-type="([^"]+)"/g));
  const categories = Array.from(new Set(
    categoryMatches
      .map((match) => match[1].trim())
      .filter((item) => item && item !== 'All'),
  ));

  const channels = Array.from(
    html.matchAll(/<li class="([^"]+)">\s*<a[^>]+player\.php\?stream=(\d+)'[^>]*>\s*<img src="([^"]+)" alt="([^"]+)"/g),
  ).map((match) => {
    const classes = String(match[1] || '').split(/\s+/).filter(Boolean);
    const category = classes.find((item) => item !== 'All') || 'Other';
    const streamId = String(match[2] || '');
    const imageUrl = new URL(match[3], TV_PORTAL_BASE).toString();
    const name = String(match[4] || '').trim();

    return {
      id: `${category.toLowerCase()}-${streamId}`,
      streamId,
      name,
      category,
      categories: classes.filter((item) => item !== 'All'),
      logoPath: imageUrl,
      playerPath: `/api/tv/player/${streamId}`,
    };
  });

  return {
    categories,
    channels,
  };
}

function pickDefaultStreamId(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    return '';
  }

  const preferredIds = ['80', '1', '2'];
  const preferredMatch = preferredIds.find((streamId) => channels.some((channel) => channel.streamId === streamId));
  if (preferredMatch) {
    return preferredMatch;
  }

  const fallback = channels.find((channel) => channel.streamId !== '104');
  return fallback?.streamId || channels[0]?.streamId || '';
}

function extractPrimarySource(html) {
  const match = html.match(/var primarySource = '([^']+)'/);
  if (!match?.[1]) {
    const error = new Error('TV stream source not found');
    error.status = 404;
    throw error;
  }

  return ensureAllowedUrl(match[1]).toString();
}

async function resolvePlayableSource(sourceUrl) {
  const current = ensureAllowedUrl(sourceUrl);
  const candidates = [current.toString()];

  if (current.pathname.endsWith('/index.m3u8')) {
    const fmp4Url = new URL(current.toString());
    fmp4Url.pathname = fmp4Url.pathname.replace(/\/index\.m3u8$/, '/index.fmp4.m3u8');
    candidates.unshift(fmp4Url.toString());
  }

  for (const candidate of candidates) {
    try {
      const upstream = await requestUrl(candidate, 0, 'HEAD');
      if (upstream.statusCode >= 200 && upstream.statusCode < 400) {
        return candidate;
      }
    } catch (error) {
      // Fall through to the next candidate.
    }
  }

  return current.toString();
}

function rewritePlaylist(text, baseUrl) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return line;
      }

      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (match, uri) => {
          const nextUrl = new URL(uri, baseUrl).toString();
          return `URI="?url=${encodeURIComponent(nextUrl)}"`;
        });
      }

      const nextUrl = new URL(trimmed, baseUrl).toString();
      return `?url=${encodeURIComponent(nextUrl)}`;
    })
    .join('\n');
}

function toSiblingAssetPath(targetUrl) {
  return `../asset?url=${encodeURIComponent(targetUrl)}`;
}

async function proxyRemoteUrl(targetUrl, res) {
  const cacheKey = targetUrl.toString();
  const safeUrl = ensureAllowedUrl(targetUrl);
  const transport = safeUrl.protocol === 'https:' ? https : http;
  const agent = safeUrl.protocol === 'https:' ? httpsAgent : httpAgent;

  return new Promise((resolve, reject) => {
    const proxyReq = transport.request(safeUrl, { headers: DEFAULT_HEADERS, method: 'GET', timeout: TV_REQUEST_TIMEOUT_MS, agent }, (upstream) => {
      if (upstream.statusCode >= 400) {
        const chunks = [];
        upstream.on('data', (chunk) => chunks.push(chunk));
        upstream.on('end', () => {
          res.status(upstream.statusCode).send(Buffer.concat(chunks));
          resolve();
        });
        return;
      }

      const contentType = String(upstream.headers['content-type'] || '');
      const isPlaylist = contentType.includes('mpegurl') || safeUrl.pathname.endsWith('.m3u8');

      if (isPlaylist) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'private, max-age=3');
        const chunks = [];
        upstream.on('data', (chunk) => chunks.push(chunk));
        upstream.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          res.send(rewritePlaylist(body, safeUrl));
          resolve();
        });
        return;
      }

      const isImage = contentType.startsWith('image/');
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', isImage ? 'public, max-age=600' : 'private, max-age=10, stale-while-revalidate=5');

      // Stream directly for large binary (video segments) — avoids buffering entire file in memory
      const contentLength = Number(upstream.headers['content-length'] || 0);
      if (contentLength > 65536 && !isImage) {
        cacheSet(cacheKey, { stream: true, contentType, contentLength });
        upstream.pipe(res);
        upstream.on('end', resolve);
        upstream.on('error', reject);
        return;
      }

      // Small responses: buffer and cache
      const chunks = [];
      upstream.on('data', (chunk) => chunks.push(chunk));
      upstream.on('end', () => {
        const buf = Buffer.concat(chunks);
        cacheSet(cacheKey, buf);
        res.send(buf);
        resolve();
      });
    });

    proxyReq.on('error', reject);
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      reject(new Error(`TV request timed out after ${TV_REQUEST_TIMEOUT_MS}ms`));
    });
    proxyReq.end();
  });
}

router.get('/channels', async (req, res, next) => {
  try {
    if (!TV_PORTAL_BASE) {
      return res.status(503).json({
        ok: false,
        error: { code: 'TV_PORTAL_NOT_CONFIGURED', message: 'TV_PORTAL_BASE_URL is not set. Configure it in the .env file to enable live TV.' },
      });
    }

    const cached = cacheGet('channels', CHANNELS_CACHE_TTL_MS);
    if (cached) {
      const body = JSON.stringify(cached);
      const etag = `"${crypto.createHash('md5').update(body).digest('hex')}"`;
      res.setHeader('Cache-Control', 'private, max-age=5');
      res.setHeader('ETag', etag);
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      return res.json(cached);
    }

    const upstream = await requestUrl(TV_PORTAL_BASE);
    const html = upstream.body.toString('utf8');
    const parsed = parseChannels(html);

    const response = {
      ...parsed,
      defaultStreamId: pickDefaultStreamId(parsed.channels),
      source: TV_PORTAL_BASE,
      updatedAt: new Date().toISOString(),
    };

    cacheSet('channels', response);
    const body = JSON.stringify(response);
    const etag = `"${crypto.createHash('md5').update(body).digest('hex')}"`;
    res.setHeader('Cache-Control', 'private, max-age=5');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    res.json(response);
  } catch (error) {
    let status, code, message;

    if (error.status === 400) {
      status = 503;
      code = 'TV_SOURCE_NOT_ALLOWED';
      message = 'TV source host is not allowed.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      status = 503;
      code = 'TV_PORTAL_UNREACHABLE';
      message = 'TV source is unreachable.';
    } else if (error.message && error.message.includes('timed out')) {
      status = 504;
      code = 'TV_REQUEST_TIMEOUT';
      message = 'TV source did not respond in time.';
    } else {
      status = 500;
      code = error.code || 'TV_SERVICE_UNAVAILABLE';
      message = 'Failed to fetch TV channels.';
    }

    res.status(status).json({
      ok: false,
      error: { code, message },
    });
  }
});

router.get('/stream/:streamId', async (req, res, next) => {
  try {
    const streamId = String(req.params.streamId || '');
    const sourceCacheKey = `player-source:${streamId}`;
    let sourceUrl = cacheGet(sourceCacheKey, PLAYER_CACHE_TTL_MS);

    if (!sourceUrl) {
      const upstream = await requestUrl(`${TV_PORTAL_BASE}player.php?stream=${encodeURIComponent(streamId)}`);
      sourceUrl = await resolvePlayableSource(extractPrimarySource(upstream.body.toString('utf8')));
      cacheSet(sourceCacheKey, sourceUrl);
    }

    res.json({
      streamId,
      sourcePath: toSiblingAssetPath(sourceUrl),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/asset', async (req, res, next) => {
  try {
    const targetUrl = ensureAllowedUrl(String(req.query.url || ''));
    const cacheKey = targetUrl.toString();
    const isImage = /\.(jpg|jpeg|png|gif|svg|webp|ico)(\?|$)/i.test(targetUrl.pathname);
    const isJs = /\.js(\?|$)/i.test(targetUrl.pathname);
    const ttl = isImage ? LOGO_CACHE_TTL_MS : isJs ? 3600000 : ASSET_CACHE_TTL_MS; // JS: 1 hour, images: 10 min, segments: 5s
    const cached = cacheGet(cacheKey, ttl);

    if (cached) {
      const contentType = isImage ? 'image/png' : isJs ? 'application/javascript' : 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', isImage ? 'public, max-age=600' : isJs ? 'public, max-age=3600' : 'private, max-age=10, stale-while-revalidate=5');
      return res.send(cached);
    }

    await proxyRemoteUrl(targetUrl, res);
  } catch (error) {
    next(error);
  }
});

router.get('/player/:streamId', async (req, res, next) => {
  try {
    const streamId = String(req.params.streamId || '');
    const sourceCacheKey = `player-source:${streamId}`;
    let sourceUrl = cacheGet(sourceCacheKey, PLAYER_CACHE_TTL_MS);

    if (!sourceUrl) {
      const upstream = await requestUrl(`${TV_PORTAL_BASE}player.php?stream=${encodeURIComponent(streamId)}`);
      sourceUrl = await resolvePlayableSource(extractPrimarySource(upstream.body.toString('utf8')));
      cacheSet(sourceCacheKey, sourceUrl);
    }

    const proxiedStreamUrl = toSiblingAssetPath(sourceUrl);
    const hlsScriptUrl = toSiblingAssetPath(new URL('js/hls.js?v=5', TV_PORTAL_BASE).toString());
    const channelName = String(req.query.name || `Channel ${streamId}`);
    const channelCategory = String(req.query.category || 'Live TV');

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; img-src 'self' data: http: https:; media-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; connect-src 'self'; worker-src 'self' blob:;",
    );

    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${channelName.replace(/</g, '&lt;')} — Live TV</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; width: 100%; height: 100%;
      background: #000;
      overflow: hidden;
      font-family: "Segoe UI", system-ui, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #fff;
      cursor: none;
    }
    body { display: grid; place-items: center; }
    body.controls-visible { cursor: default; }

    video {
      width: 100%; height: 100%;
      background: #000;
      object-fit: contain;
      display: block;
    }

    /* Gradient vignette — only visible when controls shown */
    .chrome {
      position: absolute; inset: 0; pointer-events: none;
      background:
        linear-gradient(180deg,
          rgba(0,0,0,.72) 0%,
          rgba(0,0,0,.08) 22%,
          rgba(0,0,0,0)   52%,
          rgba(0,0,0,.10) 70%,
          rgba(0,0,0,.78) 100%);
      opacity: 0;
      transition: opacity 320ms ease;
      z-index: 5;
    }
    body.controls-visible .chrome { opacity: 1; }

    /* ── TOP BAR ── */
    .topbar {
      position: absolute; top: 0; left: 0; right: 0; z-index: 10;
      padding: 20px 24px 32px;
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
      pointer-events: none;
      transform: translateY(-8px);
      opacity: 0;
      transition: opacity 280ms ease, transform 280ms ease;
    }
    body.controls-visible .topbar { opacity: 1; transform: translateY(0); }

    .channel-info { display: flex; flex-direction: column; gap: 5px; }
    .live-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px;
      background: rgba(255,50,50,.18); border: 1px solid rgba(255,50,50,.35);
      color: #ff8080; font-size: 10px; font-weight: 800;
      letter-spacing: .12em; text-transform: uppercase;
      width: fit-content;
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #ff4040;
      animation: dot-pulse 1.8s ease-in-out infinite;
    }
    @keyframes dot-pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%      { opacity: .4; transform: scale(.75); }
    }
    .channel-name {
      margin: 0; font-size: clamp(1.1rem, 2.8vw, 1.9rem);
      font-weight: 800; line-height: 1.15; letter-spacing: -.02em;
      text-shadow: 0 2px 18px rgba(0,0,0,.7);
    }
    .channel-cat {
      font-size: 12px; color: rgba(255,255,255,.55); font-weight: 500;
    }

    .topbar-right {
      display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
      pointer-events: auto;
    }
    .clock-badge {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 13px; border-radius: 12px;
      background: rgba(0,0,0,.44); border: 1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(14px);
      font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums;
      letter-spacing: .03em; color: rgba(255,255,255,.88);
    }
    .clock-icon { width: 14px; height: 14px; color: rgba(255,255,255,.45); flex-shrink: 0; }

    /* ── BOTTOM CONTROLS ── */
    .controls {
      position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
      padding: 24px 20px 20px;
      display: flex; flex-direction: column; gap: 12px;
      transform: translateY(8px);
      opacity: 0;
      transition: opacity 280ms ease, transform 280ms ease;
      pointer-events: none;
    }
    body.controls-visible .controls { opacity: 1; transform: translateY(0); pointer-events: auto; }

    /* State label */
    .state-row {
      display: flex; align-items: center; gap: 10px;
    }
    .state-label {
      font-size: 12px; font-weight: 600; color: rgba(255,255,255,.55);
      letter-spacing: .03em;
    }
    .state-spinner {
      width: 12px; height: 12px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.15);
      border-top-color: rgba(255,255,255,.65);
      animation: spin .7s linear infinite; flex-shrink: 0;
      display: none;
    }
    .state-spinner.active { display: block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Scrubber-style live bar */
    .live-bar {
      height: 3px; border-radius: 999px;
      background: rgba(255,255,255,.12); overflow: hidden; position: relative;
    }
    .live-bar-fill {
      position: absolute; inset: 0 0 0 0;
      background: linear-gradient(90deg, #ff4040, #ff7a40);
      border-radius: 999px;
      animation: live-fill 2.5s ease-in-out infinite alternate;
    }
    .live-bar-fill.buffering {
      background: rgba(255,255,255,.35);
      animation: live-shimmer 1.2s linear infinite;
      background-size: 200% 100%;
      background-image: linear-gradient(90deg,
        rgba(255,255,255,.1) 0%,
        rgba(255,255,255,.35) 50%,
        rgba(255,255,255,.1) 100%);
    }
    @keyframes live-fill {
      0%   { left: 0;   right: 60%; }
      100% { left: 60%; right: 0; }
    }
    @keyframes live-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Buttons row */
    .btn-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .btn-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .btn {
      appearance: none; border: none; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      border-radius: 12px; font-family: inherit; font-weight: 700;
      transition: background 160ms, transform 120ms, opacity 160ms;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { transform: scale(.94); }
    .btn:focus-visible { outline: 2px solid rgba(255,255,255,.6); outline-offset: 2px; }

    /* Icon-only round buttons */
    .btn-icon {
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(255,255,255,.10); color: #fff;
      border: 1px solid rgba(255,255,255,.12);
      font-size: 0;
    }
    .btn-icon svg { width: 18px; height: 18px; }
    .btn-icon:hover { background: rgba(255,255,255,.18); }

    /* Primary play/pause */
    .btn-play {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(255,255,255,.95); color: #07111f;
      border: none; box-shadow: 0 4px 24px rgba(0,0,0,.35);
      font-size: 0;
    }
    .btn-play svg { width: 22px; height: 22px; }
    .btn-play:hover { background: #fff; transform: scale(1.06); }

    /* Text pill buttons */
    .btn-pill {
      height: 34px; padding: 0 14px;
      background: rgba(255,255,255,.08); color: rgba(255,255,255,.8);
      border: 1px solid rgba(255,255,255,.10);
      font-size: 12px;
    }
    .btn-pill:hover { background: rgba(255,255,255,.15); color: #fff; }
    .btn-pill svg { width: 14px; height: 14px; }

    /* Mute active state */
    .btn-icon.muted { background: rgba(255,80,80,.15); border-color: rgba(255,80,80,.25); }
    .btn-icon.muted svg { color: #ff8080; }

    /* ── DEBUG PANEL ── */
    .debug {
      position: absolute; top: 80px; right: 16px; z-index: 20;
      width: min(440px, calc(100vw - 32px));
      padding: 12px 14px; border-radius: 12px;
      background: rgba(4,10,20,.88); border: 1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(16px);
      color: #9ecfff; font-size: 11px; line-height: 1.5;
      white-space: pre-wrap; word-break: break-all;
      transition: opacity 200ms;
    }
    .debug.hidden { opacity: 0; pointer-events: none; }

    /* ── LOADING OVERLAY ── */
    .loader {
      position: absolute; inset: 0; z-index: 15;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
      background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
      transition: opacity 350ms ease;
    }
    .loader.hidden { opacity: 0; pointer-events: none; }
    .loader-ring {
      width: 48px; height: 48px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,.10);
      border-top-color: rgba(255,255,255,.75);
      animation: spin .85s linear infinite;
    }
    .loader-text {
      font-size: 13px; font-weight: 600; color: rgba(255,255,255,.55);
      letter-spacing: .04em;
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 600px) {
      .topbar { padding: 14px 14px 24px; }
      .controls { padding: 18px 14px 14px; }
      .channel-name { font-size: 1.1rem; }
      .btn-play { width: 46px; height: 46px; }
      .btn-play svg { width: 20px; height: 20px; }
      .btn-icon { width: 38px; height: 38px; }
      .btn-icon svg { width: 16px; height: 16px; }
      .clock-badge { font-size: 11px; padding: 5px 10px; }
    }
  </style>
</head>
<body>
  <video id="video" autoplay muted playsinline></video>
  <div class="chrome"></div>

  <!-- Loading overlay -->
  <div class="loader" id="loader">
    <div class="loader-ring"></div>
    <span class="loader-text">Connecting to live stream…</span>
  </div>

  <!-- Top bar -->
  <div class="topbar">
    <div class="channel-info">
      <div class="live-chip"><span class="live-dot"></span>LIVE</div>
      <h1 class="channel-name">${channelName.replace(/</g, '&lt;')}</h1>
      <span class="channel-cat">${channelCategory.replace(/</g, '&lt;')}</span>
    </div>
    <div class="topbar-right">
      <div class="clock-badge">
        <svg class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span id="liveClock">--:--:--</span>
      </div>
    </div>
  </div>

  <!-- Debug panel (hidden, toggle with backtick key) -->
  <pre class="debug hidden" id="debugPanel">Initialising…</pre>

  <!-- Bottom controls -->
  <div class="controls" id="controls">
    <div class="state-row">
      <div class="state-spinner" id="stateSpinner"></div>
      <span class="state-label" id="state">Connecting…</span>
    </div>
    <div class="live-bar"><div class="live-bar-fill buffering" id="liveBarFill"></div></div>
    <div class="btn-row">
      <div class="btn-group">
        <!-- Play/Pause -->
        <button class="btn btn-play" id="playPauseButton" type="button" aria-label="Pause">
          <svg id="iconPlay" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <svg id="iconPause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
        <!-- Mute -->
        <button class="btn btn-icon" id="muteButton" type="button" aria-label="Mute">
          <svg id="iconVolOn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <svg id="iconVolOff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        </button>
        <!-- Retry -->
        <button class="btn btn-pill" id="retryButton" type="button" aria-label="Retry stream">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.95"/></svg>
          Retry
        </button>
      </div>
      <div class="btn-group">
        <!-- PiP -->
        <button class="btn btn-icon" id="pipButton" type="button" aria-label="Picture in picture">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="11" width="9" height="6" rx="1"/></svg>
        </button>
        <!-- Fullscreen -->
        <button class="btn btn-icon" id="fullscreenButton" type="button" aria-label="Fullscreen">
          <svg id="iconFullIn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          <svg id="iconFullOut" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:none"><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>
        </button>
      </div>
    </div>
  </div>

  <script src="${hlsScriptUrl}"></script>
  <script>
    const video      = document.getElementById('video');
    const loader     = document.getElementById('loader');
    const stateEl    = document.getElementById('state');
    const spinner    = document.getElementById('stateSpinner');
    const liveBar    = document.getElementById('liveBarFill');
    const debugPanel = document.getElementById('debugPanel');
    const liveClock  = document.getElementById('liveClock');
    const playPauseButton  = document.getElementById('playPauseButton');
    const muteButton       = document.getElementById('muteButton');
    const retryButton      = document.getElementById('retryButton');
    const pipButton        = document.getElementById('pipButton');
    const fullscreenButton = document.getElementById('fullscreenButton');
    const iconPlay    = document.getElementById('iconPlay');
    const iconPause   = document.getElementById('iconPause');
    const iconVolOn   = document.getElementById('iconVolOn');
    const iconVolOff  = document.getElementById('iconVolOff');
    const iconFullIn  = document.getElementById('iconFullIn');
    const iconFullOut = document.getElementById('iconFullOut');

    const source = ${JSON.stringify(proxiedStreamUrl)};
    let hls;
    const debugLines = [];
    let hideTimer = null;
    let isReady = false;

    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;

    // ── Auto-hide controls ──────────────────────────────────────────────────
    function showControls() {
      document.body.classList.add('controls-visible');
      clearTimeout(hideTimer);
      if (isReady) {
        hideTimer = setTimeout(hideControls, 3000);
      }
    }
    function hideControls() {
      if (!isReady) return;
      document.body.classList.remove('controls-visible');
    }

    document.addEventListener('mousemove', showControls);
    document.addEventListener('touchstart', showControls, { passive: true });
    document.addEventListener('click', showControls);
    document.addEventListener('keydown', showControls);

    // Start with controls visible (loading state)
    showControls();

    // ── Clock ────────────────────────────────────────────────────────────────
    function updateClock() {
      liveClock.textContent = new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ── State UI ─────────────────────────────────────────────────────────────
    function setState(msg, busy) {
      stateEl.textContent = msg;
      spinner.classList.toggle('active', Boolean(busy));
      pushDebug('State: ' + msg);
    }

    function setReady() {
      isReady = true;
      loader.classList.add('hidden');
      liveBar.classList.remove('buffering');
      setState('Live — ' + ${JSON.stringify(channelName.replace(/</g, '&lt;'))});
      // auto-hide after 3s
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideControls, 3000);
    }

    // ── Button state sync ────────────────────────────────────────────────────
    function updateButtons() {
      const paused = video.paused;
      iconPlay.style.display  = paused ? '' : 'none';
      iconPause.style.display = paused ? 'none' : '';
      playPauseButton.setAttribute('aria-label', paused ? 'Play' : 'Pause');

      const muted = video.muted || video.volume === 0;
      iconVolOn.style.display  = muted ? 'none' : '';
      iconVolOff.style.display = muted ? '' : 'none';
      muteButton.classList.toggle('muted', muted);

      const isFull = Boolean(document.fullscreenElement);
      iconFullIn.style.display  = isFull ? 'none' : '';
      iconFullOut.style.display = isFull ? '' : 'none';
      fullscreenButton.setAttribute('aria-label', isFull ? 'Exit fullscreen' : 'Fullscreen');

      const isPip = Boolean(document.pictureInPictureElement);
      pipButton.setAttribute('aria-label', isPip ? 'Exit picture in picture' : 'Picture in picture');
    }

    // ── Debug ────────────────────────────────────────────────────────────────
    function pushDebug(msg) {
      const stamp = new Date().toLocaleTimeString();
      debugLines.unshift('[' + stamp + '] ' + msg);
      if (debugLines.length > 12) debugLines.length = 12;
      debugPanel.textContent = debugLines.join('\\n');
      try {
        window.parent.postMessage({
          type: 'tv-player-debug',
          streamId: ${JSON.stringify(String(req.params.streamId || ''))},
          lines: debugLines.slice(),
          state: stateEl.textContent,
          source,
        }, '*');
      } catch (_) {}
    }

    // Toggle debug with backtick key
    document.addEventListener('keydown', function (e) {
      if (e.key === '\`') debugPanel.classList.toggle('hidden');
    });

    // ── HLS / native playback ────────────────────────────────────────────────
    function destroyHls() {
      if (hls) { hls.destroy(); hls = null; }
    }

    function playNative() {
      destroyHls();
      video.src = source;
      video.load();
      setState('Opening stream…', true);
      pushDebug('Native HLS playback');
      video.play().catch(function () { setState('Tap play to start'); });
    }

    function attachHls() {
      destroyHls();
      hls = new window.Hls({
        debug: false, enableWorker: true,
        lowLatencyMode: false, backBufferLength: 90,
      });
      pushDebug('HLS.js playback');

      hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
        setReady();
        video.play().catch(function () { setState('Tap play to start'); });
      });

      hls.on(window.Hls.Events.LEVEL_LOADED, function (e, data) {
        pushDebug('Level loaded: frags=' + (data?.details?.fragments?.length || 0));
      });

      hls.on(window.Hls.Events.ERROR, function (e, data) {
        pushDebug('HLS err: ' + (data?.type || '?') + ' / ' + (data?.details || '?') + ' fatal=' + Boolean(data?.fatal));
        if (!data?.fatal) return;
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          setState('Reconnecting…', true);
          liveBar.classList.add('buffering');
          hls.startLoad();
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
          setState('Recovering…', true);
          hls.recoverMediaError();
        } else {
          setState('Stream temporarily unavailable');
        }
      });

      hls.loadSource(source);
      hls.attachMedia(video);
    }

    // ── Video events ─────────────────────────────────────────────────────────
    video.addEventListener('loadedmetadata', function () {
      setReady();
      pushDebug('Metadata loaded, readyState=' + video.readyState);
      video.play().catch(function () { setState('Tap play to start'); });
    });

    video.addEventListener('playing', function () {
      setReady();
      updateButtons();
    });

    video.addEventListener('waiting', function () {
      setState('Buffering…', true);
      liveBar.classList.add('buffering');
      pushDebug('Buffering');
    });

    video.addEventListener('canplay', function () {
      liveBar.classList.remove('buffering');
    });

    video.addEventListener('error', function () {
      const code = video.error?.code || '?';
      pushDebug('Video error: code=' + code);
      setState('Could not load stream');
    });

    video.addEventListener('stalled', function () { pushDebug('Stalled'); });
    video.addEventListener('pause',         updateButtons);
    video.addEventListener('volumechange',  updateButtons);
    document.addEventListener('fullscreenchange', updateButtons);
    document.addEventListener('enterpictureinpicture', updateButtons);
    document.addEventListener('leavepictureinpicture', updateButtons);

    // ── Controls ──────────────────────────────────────────────────────────────
    playPauseButton.addEventListener('click', async function () {
      if (video.paused) {
        await video.play().catch(function () { setState('Tap play to start'); });
      } else {
        video.pause();
      }
      updateButtons();
    });

    muteButton.addEventListener('click', function () {
      video.muted = !video.muted;
      updateButtons();
    });

    retryButton.addEventListener('click', function () {
      setState('Retrying…', true);
      liveBar.classList.add('buffering');
      loader.classList.remove('hidden');
      isReady = false;
      pushDebug('Manual retry');
      if (window.Hls && window.Hls.isSupported()) { attachHls(); return; }
      playNative();
    });

    pipButton.addEventListener('click', async function () {
      if (!document.pictureInPictureEnabled) { setState('PiP not available'); return; }
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      } catch (err) { pushDebug('PiP error: ' + err.message); }
      updateButtons();
    });

    fullscreenButton.addEventListener('click', async function () {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await (document.documentElement.requestFullscreen?.() || video.requestFullscreen?.());
      } catch (err) { pushDebug('Fullscreen error: ' + err.message); }
      updateButtons();
    });

    // ── Init ──────────────────────────────────────────────────────────────────
    pushDebug('Source: ' + source);
    pushDebug('HLS.js=' + Boolean(window.Hls?.isSupported()) + '  Native=' + Boolean(video.canPlayType('application/vnd.apple.mpegurl')));
    setState('Connecting…', true);
    updateButtons();

    if (window.Hls && window.Hls.isSupported()) {
      attachHls();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      playNative();
    } else {
      setState('Browser cannot play this stream');
      loader.classList.add('hidden');
    }
  </script>
</body>
</html>`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
