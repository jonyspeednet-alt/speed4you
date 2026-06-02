const fs = require('fs');
const { db, ensureContentStore } = require('./base');
const { JUNK_REGEX, MIN_EPISODE_SIZE, MIN_MOVIE_SIZE } = require('./constants');
const { normalizeItem, normalizeTitleKey, extractTypedColumns, attachDuplicateMetadata } = require('./helpers');
const { scoreSearchResult } = require('./helpers-search');
const { loadScannerRoots } = require('./scanner');

async function allocateNextCatalogId() {
  await ensureContentStore();
  const pool = await db.getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const [stateResult, maxIdResult] = await Promise.all([
      client.query(`SELECT value FROM app_state WHERE key = 'catalog_meta' LIMIT 1 FOR UPDATE`),
      client.query('SELECT COALESCE(MAX(id), 0)::bigint AS max_id FROM content_catalog'),
    ]);
    const currentMeta = stateResult.rows[0]?.value || { nextId: 1 };
    const currentNextId = Number(currentMeta.nextId || 1);
    const maxId = Number(maxIdResult.rows[0]?.max_id || 0);
    const nextId = Math.max(currentNextId, maxId + 1, 1);
    await client.query(
      `INSERT INTO app_state (key, value, updated_at)
       VALUES ('catalog_meta', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify({ nextId: nextId + 1 })],
    );
    await client.query('COMMIT');
    return nextId;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getItems() {
  await ensureContentStore();
  const result = await db.query('SELECT payload FROM content_catalog ORDER BY id ASC');
  return result.rows.map((row) => row.payload);
}

function buildCatalogFilterClauses(filters = {}, params = []) {
  const clauses = [];
  const push = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.status)       clauses.push(`status = ${push(String(filters.status))}`);
  if (filters.type)         clauses.push(`content_type = ${push(String(filters.type))}`);
  if (filters.source)       clauses.push(`source_type = ${push(String(filters.source))}`);
  if (filters.sourceRootId) clauses.push(`source_root_id = ${push(String(filters.sourceRootId))}`);
  if (filters.scanRunId)    clauses.push(`last_scan_run_id = ${push(String(filters.scanRunId))}`);
  if (filters.language) {
    const langPlaceholder = push('%' + String(filters.language).trim().toLowerCase() + '%');
    clauses.push(`LOWER(COALESCE(language, '')) LIKE ${langPlaceholder}`);
  }
  if (filters.category)     clauses.push(`category = ${push(String(filters.category))}`);
  if (filters.collection)   clauses.push(`collection = ${push(String(filters.collection))}`);
  if (filters.year) {
    const yearStr = String(filters.year).trim();
    if (/^\d{4}$/.test(yearStr)) {
      clauses.push(`year = ${push(Number(yearStr))}`);
    } else if (/^\d{4}s$/.test(yearStr)) {
      const decadeStart = Number(yearStr.slice(0, 4));
      const decadeEnd = decadeStart + 9;
      clauses.push(`year BETWEEN ${push(decadeStart)} AND ${push(decadeEnd)}`);
    } else if (yearStr.toLowerCase() === 'pre-1990s' || yearStr.toLowerCase() === 'pre-1990') {
      clauses.push(`year < 1990`);
    } else {
      const numYear = Number(yearStr);
      if (!isNaN(numYear)) {
        clauses.push(`year = ${push(numYear)}`);
      }
    }
  }
  if (filters.featured)     clauses.push(`featured = true`);
  if (filters.duplicatesOnly) clauses.push(`duplicate_count > 0`);

  if (filters.tag) {
    clauses.push(`COALESCE(payload->'tags', '[]'::jsonb) ? ${push(String(filters.tag))}`);
  }
  if (filters.genre) {
    const genreParam = String(filters.genre).trim().toLowerCase();
    const genrePlaceholderExact = push(genreParam);
    const genrePlaceholderLike = push('%' + genreParam + '%');
    clauses.push(
      `(`
      + `LOWER(COALESCE(payload->>'genre', '')) LIKE ${genrePlaceholderLike}`
      + ` OR LOWER(COALESCE(category, '')) LIKE ${genrePlaceholderLike}`
      + ` OR EXISTS (`
      + `SELECT 1 FROM jsonb_array_elements_text(COALESCE(payload->'genres', '[]'::jsonb)) AS genre_value`
      + ` WHERE LOWER(genre_value) = ${genrePlaceholderExact}`
      + `)`
      + ` OR EXISTS (`
      + `SELECT 1 FROM jsonb_array_elements_text(COALESCE(payload->'tags', '[]'::jsonb)) AS tag_value`
      + ` WHERE LOWER(tag_value) = ${genrePlaceholderExact}`
      + `)`
      + `)`,
    );
  }

  if (filters.search) {
    const rawSearch = String(filters.search).trim();
    const tsQueryPlaceholder = push(rawSearch);
    const trgmPlaceholder = push(rawSearch);

    clauses.push(
      `(`
      + `(search_vector @@ plainto_tsquery('english', ${tsQueryPlaceholder}))`
      + ` OR (title % ${trgmPlaceholder})`
      + ` OR ((payload->>'originalTitle') % ${trgmPlaceholder})`
      + `)`
    );
  }


  return clauses;
}

const duplicateGroupCache = new Map();
const DUPLICATE_GROUP_CACHE_TTL = 60 * 1000; // 60 seconds

async function getDuplicateGroupsForItems(items = []) {
  if (!items.length) return new Map();
  await ensureContentStore();
  const keys = [...new Set(items.map((item) => `${item.type}:${item.titleKey || normalizeTitleKey(item.title)}`))];
  const sortedKeys = [...keys].sort();
  const cacheKey = sortedKeys.join('|');
  const cached = duplicateGroupCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < DUPLICATE_GROUP_CACHE_TTL) {
    return cached.groups;
  }

  const conditions = [];
  const params = [];

  keys.forEach((key) => {
    const colonIndex = key.indexOf(':');
    const type = key.slice(0, colonIndex);
    const titleKey = key.slice(colonIndex + 1);
    params.push(type);
    const typeIndex = params.length;
    params.push(titleKey);
    const titleKeyIndex = params.length;
    conditions.push(`(content_type = $${typeIndex} AND title_key = $${titleKeyIndex})`);
  });

  const result = await db.query(`SELECT payload FROM content_catalog WHERE ${conditions.join(' OR ')}`, params);
  const groups = new Map();
  result.rows.forEach((row) => {
    const item = normalizeItem(row.payload);
    const key = `${item.type}:${item.titleKey || normalizeTitleKey(item.title)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  // Keep cache bounded to 100 entries
  duplicateGroupCache.set(cacheKey, { groups, ts: Date.now() });
  if (duplicateGroupCache.size > 100) {
    const oldest = duplicateGroupCache.keys().next().value;
    duplicateGroupCache.delete(oldest);
  }

  return groups;
}

async function listItems(filters = {}, offset = 0, limit = null, sort = 'latest', includeDuplicates = true) {
  await ensureContentStore();
  const params = [];
  const clauses = buildCatalogFilterClauses(filters, params);
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*)::int AS count FROM content_catalog ${whereClause}`, params);
  const total = Number(countResult.rows[0]?.count || 0);

  let orderClause = '';
  if (sort === 'popular') {
    orderClause = 'ORDER BY (COALESCE(rating, 0.0) * 0.7 + LN(1.0 + COALESCE(trending_score, 0.0)) * 0.5) DESC NULLS LAST, id DESC';
  } else if (sort === 'rating') {
    orderClause = 'ORDER BY rating DESC NULLS LAST, id DESC';
  } else if (sort === 'trending') {
    orderClause = 'ORDER BY trending_score DESC, id DESC';
  } else if (sort === 'featured') {
    orderClause = 'ORDER BY featured_order DESC NULLS LAST, CASE WHEN featured THEN 1 ELSE 0 END DESC, id DESC';
  } else if (sort === 'released') {
    orderClause = 'ORDER BY released_at DESC NULLS LAST, trending_score DESC, id DESC';
  } else {
    orderClause = 'ORDER BY COALESCE(released_at, published_at, updated_at) DESC NULLS LAST, id DESC';
  }

  const listParams = [...params];
  let pagingClause = '';
  if (limit !== null && Number(limit) > 0) {
    listParams.push(Number(limit));
    pagingClause += ` LIMIT $${listParams.length}`;
  }
  if (offset > 0) {
    listParams.push(Number(offset));
    pagingClause += ` OFFSET $${listParams.length}`;
  }

  const result = await db.query(`SELECT payload FROM content_catalog ${whereClause} ${orderClause} ${pagingClause}`, listParams);
  const items = result.rows.map((row) => normalizeItem(row.payload));
  if (!includeDuplicates) return { items, total };

  const duplicateGroups = await getDuplicateGroupsForItems(items);
  return { items: items.map((item) => attachDuplicateMetadata(item, duplicateGroups)), total };
}

async function getItemById(idOrSlug) {
  await ensureContentStore();
  const numericId = Number(idOrSlug);
  let result;
  if (Number.isFinite(numericId) && numericId > 0) {
    result = await db.query('SELECT payload FROM content_catalog WHERE id = $1 LIMIT 1', [numericId]);
  } else {
    result = await db.query("SELECT payload FROM content_catalog WHERE payload->>'slug' = $1 LIMIT 1", [String(idOrSlug)]);
  }
  const payload = result.rows[0]?.payload;
  if (!payload) return null;
  const item = normalizeItem(payload);
  const duplicateGroups = await getDuplicateGroupsForItems([item]);
  return attachDuplicateMetadata(item, duplicateGroups);
}

async function getItemsByIds(ids = []) {
  const numericIds = [...new Set(ids.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  if (!numericIds.length) return new Map();
  await ensureContentStore();
  const result = await db.query('SELECT payload FROM content_catalog WHERE id = ANY($1::bigint[])', [numericIds]);
  const itemsMap = new Map();
  for (const row of result.rows) {
    const item = normalizeItem(row.payload);
    itemsMap.set(Number(item.id), item);
  }
  return itemsMap;
}

async function createItem(payload) {
  const now = new Date().toISOString();
  const item = normalizeItem({
    id: await allocateNextCatalogId(),
    createdAt: now,
    updatedAt: now,
    sourceType: payload.sourceType || 'manual',
    ...payload,
    titleKey: normalizeTitleKey(payload.title),
  });
  const cols = extractTypedColumns(item);
  await db.query(
    `INSERT INTO content_catalog (
       id, payload, created_at, updated_at,
       status, content_type, title, title_key, language, category, collection,
       source_type, source_root_id, last_scan_run_id, year, rating, featured,
       featured_order, trending_score, duplicate_count, metadata_status,
       published_at, released_at
     ) VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
    [item.id, JSON.stringify(item), now, now, cols.status, cols.content_type, cols.title, cols.title_key, cols.language, cols.category, cols.collection, cols.source_type, cols.source_root_id, cols.last_scan_run_id, cols.year, cols.rating, cols.featured, cols.featured_order, cols.trending_score, cols.duplicate_count, cols.metadata_status, cols.published_at, cols.released_at]
  );
  return getItemById(item.id);
}

async function updateItem(id, payload) {
  const current = await getItemById(id);
  if (!current) return null;
  const updated = normalizeItem({ ...current, ...payload, id: current.id, titleKey: normalizeTitleKey(payload.title || current.title), updatedAt: new Date().toISOString() });
  const cols = extractTypedColumns(updated);
  await db.query(
    `UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW(), status = $3, content_type = $4, title = $5, title_key = $6, language = $7, category = $8, collection = $9, source_type = $10, source_root_id = $11, last_scan_run_id = $12, year = $13, rating = $14, featured = $15, featured_order = $16, trending_score = $17, duplicate_count = $18, metadata_status = $19, published_at = $20, released_at = $21 WHERE id = $1`,
    [updated.id, JSON.stringify(updated), cols.status, cols.content_type, cols.title, cols.title_key, cols.language, cols.category, cols.collection, cols.source_type, cols.source_root_id, cols.last_scan_run_id, cols.year, cols.rating, cols.featured, cols.featured_order, cols.trending_score, cols.duplicate_count, cols.metadata_status, cols.published_at, cols.released_at]
  );
  return getItemById(updated.id);
}

async function deleteItem(id) {
  await ensureContentStore();
  const result = await db.query('DELETE FROM content_catalog WHERE id = $1', [Number(id)]);
  return result.rowCount > 0;
}

async function searchItems(query, filters = {}) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) return { items: [], total: 0 };
  await ensureContentStore();
  const searchFilters = { ...filters, status: filters.status || 'published', search: normalizedQuery };
  const params = [];
  const clauses = buildCatalogFilterClauses(searchFilters, params);
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const qParamIndex = params.length + 1;
  const listParams = [...params, normalizedQuery];
  
  const queryStr = `
    SELECT payload,
           (ts_rank(search_vector, plainto_tsquery('english', $${qParamIndex})) * 10 + 
            similarity(title, $${qParamIndex}) * 5) as db_score
    FROM content_catalog 
    ${whereClause} 
    ORDER BY db_score DESC 
    LIMIT 50
  `;
  
  const result = await db.query(queryStr, listParams);
  const items = result.rows.map((row) => ({
    ...normalizeItem(row.payload),
    searchScore: row.db_score || 0
  }));
  
  const duplicateGroups = await getDuplicateGroupsForItems(items);
  const scoredItems = items
    .map((item) => attachDuplicateMetadata(item, duplicateGroups))
    .sort((left, right) => right.searchScore - left.searchScore || (right.trendingScore || 0) - (left.trendingScore || 0));
  
  return { items: scoredItems, total: scoredItems.length };
}

async function getSuggestions(query, limit = 8) {
  const result = await searchItems(query, { status: 'published' });
  return (result.items || []).slice(0, limit).map((item) => ({ id: item.id, title: item.title, type: item.type, year: item.year, language: item.language, genre: item.genre }));
}

async function pruneCatalog() {
  await ensureContentStore();
  const { items } = await listItems({}, 0, null, 'latest', false);
  const scannerRoots = loadScannerRoots();
  const scannerPaths = scannerRoots.map(r => r.scanPath).filter(Boolean);
  const toDelete = [];
  for (const item of items) {
    const isJunk = JUNK_REGEX.test(item.title) || (item.sourcePath && JUNK_REGEX.test(item.sourcePath));
    if (isJunk) { toDelete.push(item.id); continue; }
    if (!item.sourcePath) continue;
    const withinScannedPath = scannerPaths.some(rootPath => item.sourcePath.startsWith(rootPath));
    if (!withinScannedPath) continue;
    try {
      if (fs.existsSync(item.sourcePath)) {
        const stats = fs.statSync(item.sourcePath);
        const minSize = item.type === 'series' ? MIN_EPISODE_SIZE : MIN_MOVIE_SIZE;
        if (stats.size < minSize) toDelete.push(item.id);
      } else {
        toDelete.push(item.id);
      }
    } catch {}
  }
  if (toDelete.length) await db.query('DELETE FROM content_catalog WHERE id = ANY($1)', [toDelete]);
  return { deletedCount: toDelete.length };
}

async function vacuumDatabase() {
  await ensureContentStore();
  if (!db.isInMemory) {
    try {
      await db.query('VACUUM ANALYZE content_catalog');
      await db.query('VACUUM ANALYZE app_state');
      await db.query('VACUUM ANALYZE scanner_runs');
      return { success: true };
    } catch (err) {
      console.error('Vacuum failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: true };
}

async function getLibraryOrganization(filters = {}) {
  await ensureContentStore();
  const params = [];
  const clauses = buildCatalogFilterClauses(filters, params);
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const totalsPromise = db.query(`SELECT COUNT(*)::int AS items, COUNT(DISTINCT collection)::int AS collections FROM content_catalog ${whereClause}`, params);
  const categoriesPromise = db.query(`SELECT category AS label, COUNT(*)::int AS count FROM content_catalog ${whereClause} GROUP BY label ORDER BY count DESC, label ASC LIMIT 200`, params);
  const languagesPromise = db.query(`SELECT language AS label, COUNT(*)::int AS count FROM content_catalog ${whereClause} GROUP BY label ORDER BY count DESC, label ASC LIMIT 200`, params);
  const collectionsPromise = db.query(`SELECT collection AS label, COUNT(*)::int AS count FROM content_catalog ${whereClause ? whereClause + '\n    AND' : 'WHERE'} collection <> '' GROUP BY label ORDER BY count DESC, label ASC LIMIT 200`, params);
  const rootsPromise = db.query(`SELECT COALESCE(NULLIF(payload->>'sourceRootLabel', ''), source_root_id) AS label, COUNT(*)::int AS count FROM content_catalog ${whereClause} GROUP BY label ORDER BY count DESC, label ASC LIMIT 100`, params);
  const tagsPromise = db.query(`SELECT tag AS label, COUNT(*)::int AS count FROM (SELECT payload->'tags' AS tags FROM content_catalog ${whereClause}) AS filtered, jsonb_array_elements_text(COALESCE(filtered.tags, '[]'::jsonb)) AS tag GROUP BY label ORDER BY count DESC, label ASC LIMIT 200`, params);
  const [totalsRes, categoriesRes, languagesRes, collectionsRes, rootsRes, tagsRes] = await Promise.all([totalsPromise, categoriesPromise, languagesPromise, collectionsPromise, rootsPromise, tagsPromise]);
  return { totals: { items: totalsRes.rows[0]?.items || 0, collections: totalsRes.rows[0]?.collections || 0, tags: tagsRes.rows.length }, collections: collectionsRes.rows, tags: tagsRes.rows, categories: categoriesRes.rows, languages: languagesRes.rows, roots: rootsRes.rows.filter((r) => r.label !== null) };
}

/**
 * Remove episode-level entries that were incorrectly indexed as separate series items.
 * These are items with content_type='series' but without a nested seasons array.
 * Returns the number of deleted items.
 */
async function cleanupOrphanEpisodeEntries() {
  await ensureContentStore();
  const result = await db.query(`
    DELETE FROM content_catalog
    WHERE content_type = 'series'
      AND (
        payload->>'seasons' IS NULL
        OR payload->>'seasons' = '[]'
        OR jsonb_array_length(COALESCE(payload->'seasons', '[]'::jsonb)) = 0
      )
      AND status <> 'archived'
  `);
  return result.rowCount || 0;
}

module.exports = {
  allocateNextCatalogId,
  getItems,
  listItems,
  getItemById,
  getItemsByIds,
  createItem,
  updateItem,
  deleteItem,
  searchItems,
  getSuggestions,
  pruneCatalog,
  vacuumDatabase,
  getLibraryOrganization,
  getDuplicateGroupsForItems,
  cleanupOrphanEpisodeEntries,
};
