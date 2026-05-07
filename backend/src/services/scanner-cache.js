/**
 * Phase 1: Critical Fix - Metadata Caching System
 * 
 * Provides caching layer for TMDB/OMDB metadata to reduce API calls
 * and improve scanner performance.
 */

const fs = require('fs');
const path = require('path');

// In-memory cache with TTL
const CACHE_DIR = path.join(process.cwd(), '.cache', 'metadata');
const MEMORY_CACHE = new Map();
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Generate cache key from search parameters
function getCacheKey(provider, params) {
  const keyStr = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  const safeHash = Buffer.from(keyStr).toString('base64url');
  return `${String(provider || 'cache').toLowerCase()}-${safeHash}`;
}

// Get cache file path
function getCacheFilePath(cacheKey) {
  return path.join(CACHE_DIR, `${String(cacheKey).replace(/[^a-z0-9._-]/gi, '_')}.json`);
}

// Check if cache entry is expired
function isExpired(entry) {
  if (!entry.expiresAt) return true;
  return Date.now() > entry.expiresAt;
}

// Get from memory cache
function getFromMemoryCache(cacheKey) {
  const entry = MEMORY_CACHE.get(cacheKey);
  if (!entry || isExpired(entry)) {
    MEMORY_CACHE.delete(cacheKey);
    return null;
  }
  return entry.data;
}

// Set to memory cache
function setToMemoryCache(cacheKey, data, ttl = DEFAULT_TTL) {
  MEMORY_CACHE.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

// Get from disk cache
function getFromDiskCache(cacheKey) {
  try {
    const filePath = getCacheFilePath(cacheKey);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const entry = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (isExpired(entry)) {
      fs.unlinkSync(filePath);
      return null;
    }

    // Populate memory cache
    setToMemoryCache(cacheKey, entry.data);
    return entry.data;
  } catch (error) {
    return null;
  }
}

// Set to disk cache
function setToDiskCache(cacheKey, data, ttl = DEFAULT_TTL) {
  try {
    ensureCacheDir();
    const filePath = getCacheFilePath(cacheKey);
    const entry = {
      data,
      expiresAt: Date.now() + ttl,
      cachedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
  } catch (error) {
    // Silent fail - don't break flow if cache write fails
  }
}

// Get cached metadata
function getCachedMetadata(provider, params) {
  const cacheKey = getCacheKey(provider, params);
  return getFromMemoryCache(cacheKey) || getFromDiskCache(cacheKey);
}

// Set cached metadata
function setCachedMetadata(provider, params, data, ttl = DEFAULT_TTL) {
  const cacheKey = getCacheKey(provider, params);
  setToMemoryCache(cacheKey, data, ttl);
  setToDiskCache(cacheKey, data, ttl);
}

// Clear expired cache entries
function clearExpiredCache() {
  try {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    
    for (const file of files) {
      try {
        const filePath = path.join(CACHE_DIR, file);
        const entry = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (now > (entry.expiresAt || 0)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Skip files that can't be read/parsed
      }
    }
  } catch (error) {
    // Silent fail
  }
}

// Clear all cache
function clearAllCache() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    }
    MEMORY_CACHE.clear();
  } catch (error) {
    // Silent fail
  }
}

// Get cache statistics
function getCacheStats() {
  try {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR);
    const stats = {
      memoryEntries: MEMORY_CACHE.size,
      diskEntries: files.length,
      totalSizeBytes: 0,
      expiredEntries: 0,
    };

    const now = Date.now();
    for (const file of files) {
      try {
        const filePath = path.join(CACHE_DIR, file);
        const stat = fs.statSync(filePath);
        stats.totalSizeBytes += stat.size;
        
        const entry = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (now > (entry.expiresAt || 0)) {
          stats.expiredEntries++;
        }
      } catch (error) {
        // Skip invalid files
      }
    }

    return stats;
  } catch (error) {
    return {
      memoryEntries: MEMORY_CACHE.size,
      diskEntries: 0,
      totalSizeBytes: 0,
      expiredEntries: 0,
    };
  }
}

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // If we've hit the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire(); // Retry after waiting
      }
    }
    
    this.requests.push(now);
    return true;
  }

  getRemaining() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

// Global rate limiter instances
const rateLimiters = {
  tmdb: new RateLimiter(40, 1000), // 40 requests per second (TMDB limit)
  omdb: new RateLimiter(10, 1000), // 10 requests per second (OMDB limit)
};

/**
 * Fetch with rate limiting and caching
 */
async function fetchWithRateLimitAndCache(provider, fetchFn, params, cacheTtl) {
  // Check cache first
  const cached = getCachedMetadata(provider, params);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  // Apply rate limiting
  const limiter = rateLimiters[provider.toLowerCase()];
  if (limiter) {
    await limiter.acquire();
  }

  // Fetch new data
  const data = await fetchFn(params);
  
  // Cache the result
  setCachedMetadata(provider, params, data, cacheTtl || DEFAULT_TTL);
  
  return { data, fromCache: false };
}

// Clear expired cache periodically (every hour)
if (!global.cacheCleanupInterval) {
  global.cacheCleanupInterval = setInterval(() => {
    clearExpiredCache();
  }, 60 * 60 * 1000); // Every hour
  if (typeof global.cacheCleanupInterval.unref === 'function') {
    global.cacheCleanupInterval.unref();
  }
}

module.exports = {
  getCachedMetadata,
  setCachedMetadata,
  clearExpiredCache,
  clearAllCache,
  getCacheStats,
  fetchWithRateLimitAndCache,
  RateLimiter,
  DEFAULT_TTL,
};
