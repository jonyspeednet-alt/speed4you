const express = require('express');
const router = express.Router();
const { listItems, searchItems, getItemById, toCardItem } = require('../data/store');
const { setApiCacheHeaders } = require('../middleware/response-optimizer');
const HOMEPAGE_LIMIT = 10;

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getItemRecencyTimestamp(item) {
  const candidates = [
    item?.releasedAt,
    item?.publishedAt,
    item?.metadataUpdatedAt,
    item?.updatedAt,
    item?.createdAt,
  ];

  for (const value of candidates) {
    const timestamp = new Date(value || 0).getTime();
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }

  const numericYear = Number(item?.year || 0);
  if (Number.isFinite(numericYear) && numericYear > 1900) {
    return new Date(`${numericYear}-01-01T00:00:00.000Z`).getTime();
  }

  return 0;
}

function sortByLatest(items) {
  return [...items].sort((left, right) => {
    const recencyDelta = getItemRecencyTimestamp(right) - getItemRecencyTimestamp(left);
    if (recencyDelta !== 0) {
      return recencyDelta;
    }

    return Number(right?.id || 0) - Number(left?.id || 0);
  });
}

async function getPublishedItems(filters = {}, offset = 0, limit = null, sort = 'latest') {
  const { items } = await listItems({ ...filters, status: 'published' }, offset, limit, sort);
  return items;
}


function normalizeQueryValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = String(value).trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null' || normalized === 'All') {
    return '';
  }

  return normalized;
}

function normalizePositiveInt(value, defaultValue, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, min), max);
}

async function buildHomepagePayload(limit = HOMEPAGE_LIMIT) {
  const FEATURED_POOL = 30;
  const [featuredPool, latest, popular, trending, series] = await Promise.all([
    getPublishedItems({}, 0, FEATURED_POOL, 'released'),
    getPublishedItems({ type: 'movie' }, 0, limit, 'latest'),
    getPublishedItems({}, 0, limit, 'popular'),
    getPublishedItems({}, 0, limit, 'trending'),
    getPublishedItems({ type: 'series' }, 0, limit, 'latest')
  ]);

  return {
    featured: featuredPool.map(toCardItem),
    latest: latest.map(toCardItem),
    popular: popular.map(toCardItem),
    trending: trending.map(toCardItem),
    series: series.map(toCardItem),
    generatedAt: new Date().toISOString(),
  };
}

router.get('/featured', asyncRoute(async (req, res) => {
  const items = await getPublishedItems({ featured: true }, 0, 1);
  const featured = items[0] || (await getPublishedItems({}, 0, 1))[0] || null;
  setApiCacheHeaders(res, req.originalUrl);
  res.json(featured);
}));

router.get('/', asyncRoute(async (req, res) => {
  const page = normalizePositiveInt(req.query.page, 1, { min: 1, max: 100000 });
  const limit = normalizePositiveInt(req.query.limit, 24, { min: 1, max: 100 });
  const sort = normalizeQueryValue(req.query.sort) || 'latest';

  const { items, total } = await listItems({ status: 'published' }, (page - 1) * limit, limit, sort);
  const featured = items.find(i => i.featured) || items[0] || null;

  setApiCacheHeaders(res, req.originalUrl);
  res.json({
    items: items.map(toCardItem),
    featured: featured ? toCardItem(featured) : null,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  });
}));

router.get('/latest', asyncRoute(async (req, res) => {
  const limit = normalizePositiveInt(req.query.limit, 10, { min: 1, max: 100 });
  const items = await getPublishedItems({}, 0, limit, 'latest');
  setApiCacheHeaders(res, req.originalUrl);
  res.json({ items: items.map(toCardItem) });
}));

router.get('/popular', asyncRoute(async (req, res) => {
  const limit = normalizePositiveInt(req.query.limit, 10, { min: 1, max: 100 });
  const items = await getPublishedItems({}, 0, limit, 'popular');
  setApiCacheHeaders(res, req.originalUrl);
  res.json({ items: items.map(toCardItem) });
}));

router.get('/trending', asyncRoute(async (req, res) => {
  const limit = normalizePositiveInt(req.query.limit, 10, { min: 1, max: 100 });
  const items = await getPublishedItems({}, 0, limit, 'trending');
  setApiCacheHeaders(res, req.originalUrl);
  res.json({ items: items.map(toCardItem) });
}));

router.get('/local-trending', asyncRoute(async (req, res) => {
  const limit = normalizePositiveInt(req.query.limit, 10, { min: 1, max: 100 });
  
  // Extract client IP and identify subnet prefix
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ip = String(rawIp).split(',')[0].trim();
  
  let subnet = '127.0.0';
  if (ip.includes(':')) {
    // IPv6 subnet prefix (first 4 segments /64 prefix)
    const segments = ip.split(':');
    subnet = segments.slice(0, Math.min(4, segments.length)).join(':');
  } else {
    // IPv4 subnet prefix (first 3 octets /24 prefix)
    const octets = ip.split('.');
    subnet = octets.slice(0, Math.min(3, octets.length)).join('.');
  }

  // Simple polynomial rolling hash for the subnet string
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 1000000007;
    }
    return hash;
  }
  const subnetHash = hashString(subnet);

  // Fetch a wider pool of global trending items
  const poolSize = Math.min(limit + 15, 100);
  const candidates = await getPublishedItems({}, 0, poolSize, 'trending');

  // Apply a subnet-specific local boost to trending scores
  const localizedItems = candidates.map((item) => {
    const itemKey = `${item.id}-${subnetHash}`;
    const itemHash = hashString(itemKey);
    // Generate a deterministic boost between 0.0 and 2.0 based on item ID and subnet hash
    const localBoost = (itemHash % 100) / 100 * 2.0;
    
    const originalScore = Number(item.trendingScore || item.trending_score || 0);
    return {
      item,
      localScore: originalScore + localBoost
    };
  });

  // Re-sort items based on localized scores
  const sortedResult = localizedItems
    .sort((left, right) => right.localScore - left.localScore || Number(right.item?.id || 0) - Number(left.item?.id || 0))
    .map(entry => entry.item)
    .slice(0, limit);

  setApiCacheHeaders(res, req.originalUrl);
  res.json(sortedResult.map(toCardItem));
}));

router.get('/recommendations', asyncRoute(async (req, res) => {
  const limit = normalizePositiveInt(req.query.limit, 10, { min: 1, max: 100 });
  const seed = String(req.query.seed || '');

  let seedItem = null;
  if (seed) {
    seedItem = await getItemById(seed).catch(() => null);
  }

  // Graceful fallback to popular items if no valid seed item is found
  if (!seedItem) {
    const items = await getPublishedItems({}, 0, limit + 5, 'popular');
    const recommendations = items
      .filter((item) => String(item?.id || '') !== seed)
      .slice(0, limit);
    setApiCacheHeaders(res, req.originalUrl);
    return res.json(recommendations.map(toCardItem));
  }

  // Extract seed traits
  const seedGenres = Array.isArray(seedItem.genres)
    ? seedItem.genres.map(g => String(g || '').trim().toLowerCase())
    : (seedItem.genre ? [String(seedItem.genre).trim().toLowerCase()] : []);
    
  const seedTags = Array.isArray(seedItem.tags)
    ? seedItem.tags.map(t => String(t || '').trim().toLowerCase())
    : [];

  const seedCategory = String(seedItem.category || '').trim().toLowerCase();
  const seedLanguage = String(seedItem.language || '').trim().toLowerCase();

  // Fetch a moderate candidate pool of published items
  const candidates = await getPublishedItems({}, 0, 50, 'popular');

  // Compute similarity score for each candidate
  const scoredRecommendations = candidates
    .filter((item) => String(item?.id || '') !== String(seedItem.id))
    .map((item) => {
      const itemGenres = Array.isArray(item.genres)
        ? item.genres.map(g => String(g || '').trim().toLowerCase())
        : (item.genre ? [String(item.genre).trim().toLowerCase()] : []);
        
      const itemTags = Array.isArray(item.tags)
        ? item.tags.map(t => String(t || '').trim().toLowerCase())
        : [];

      // Calculate overlaps
      const genreOverlap = seedGenres.filter(g => itemGenres.includes(g)).length;
      const tagOverlap = seedTags.filter(t => itemTags.includes(t)).length;
      
      const categoryMatch = String(item.category || '').trim().toLowerCase() === seedCategory ? 1 : 0;
      const languageMatch = String(item.language || '').trim().toLowerCase() === seedLanguage ? 1 : 0;

      // Rating score
      const ratingVal = Number(item.rating || 0);

      // Similarity Score Formula:
      // Weighting: Genres (4.0), Tags (2.5), Category (2.0), Language (1.0), Rating (0.15)
      const similarityScore = (genreOverlap * 4.0) + (tagOverlap * 2.5) + (categoryMatch * 2.0) + (languageMatch * 1.0) + (ratingVal * 0.15);

      return {
        item,
        similarityScore
      };
    })
    // Sort by similarity score descending, falling back to rating
    .sort((left, right) => {
      if (right.similarityScore !== left.similarityScore) {
        return right.similarityScore - left.similarityScore;
      }
      return Number(right.item?.rating || 0) - Number(left.item?.rating || 0) || Number(right.item?.id || 0) - Number(left.item?.id || 0);
    })
    .map((entry) => entry.item)
    .slice(0, limit);

  // If scored pool is empty, return popular items
  if (scoredRecommendations.length === 0) {
    const items = await getPublishedItems({}, 0, limit, 'popular');
    setApiCacheHeaders(res, req.originalUrl);
    return res.json(items.map(toCardItem));
  }

  setApiCacheHeaders(res, req.originalUrl);
  res.json(scoredRecommendations.map(toCardItem));
}));

router.get('/homepage', asyncRoute(async (req, res) => {
  const limit = normalizePositiveInt(req.query.limit, HOMEPAGE_LIMIT, { min: 1, max: 100 });
  setApiCacheHeaders(res, req.originalUrl);
  res.json(await buildHomepagePayload(limit));
}));

router.get('/browse', asyncRoute(async (req, res) => {
  const type = normalizeQueryValue(req.query.type);
  const genre = normalizeQueryValue(req.query.genre);
  const language = normalizeQueryValue(req.query.language);
  const collection = normalizeQueryValue(req.query.collection);
  const tag = normalizeQueryValue(req.query.tag);
  const year = normalizeQueryValue(req.query.year);
  const q = normalizeQueryValue(req.query.q);
  const sort = normalizeQueryValue(req.query.sort) || 'latest';
  const page = normalizePositiveInt(req.query.page, 1, { min: 1, max: 100000 });
  const limit = normalizePositiveInt(req.query.limit, 20, { min: 1, max: 100 });

  const baseFilters = { status: 'published' };
  if (type) baseFilters.type = type;
  if (genre) baseFilters.genre = genre;
  if (language) baseFilters.language = language;
  if (collection) baseFilters.collection = collection;
  if (tag) baseFilters.tag = tag;
  if (year) baseFilters.year = year;

  const offset = (page - 1) * limit;
  let { items, total } = q
    ? await searchItems(q, baseFilters)
    : await listItems(baseFilters, offset, limit, sort);

  if (q) {
    total = items.length;
    items = items.slice(offset, offset + limit);
  }

  res.json({
    items: items.map(toCardItem),
    total,
    page,
    limit,
    query: q,
    nextPage: offset + items.length < total ? page + 1 : null,
    hasMore: offset + items.length < total,
  });
}));

module.exports = router;
