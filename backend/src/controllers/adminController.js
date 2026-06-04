const {
  createItem,
  deleteItem,
  getItemById,
  getRecentItems,
  getScannerRuns,
  getStats,
  getLibraryOrganization,
  listItems,
  pruneCatalog,
  updateItem,
  vacuumDatabase,
  recalculateDuplicateCounts,
  cleanupOrphanedRootItems,
} = require('../data/store');
const { getCurrentScanJob, getScannerHealth, listScannerRoots, startScanJob, stopScanJob } = require('../services/scanner');
const { loadScannerRoots, saveScannerRoots, refreshScannerCaches, loadScannerState, saveScannerState } = require('../data/store');
const { fetchMetadataByTmdbId, fetchMetadataByImdbId } = require('../services/metadata-enricher');
const { clearMetadataCache, getEnhancedCacheStats } = require('../services/scanner-enhanced-metadata');
const { getDuplicateReviewReport, runDuplicateCleanup, getCatalogDuplicateGroups } = require('../services/duplicate-review');
const { listUsers, createUser, updateUser, deleteUser } = require('../services/admin-user');
const { AppError } = require('../utils/error');
const db = require('../config/database');
const { saveBufferAsset, saveDataUrlAsset } = require('../utils/assetHelper');
const fs = require('fs');

function pickMovieVideoUrlFromSeasons(seasons = []) {
  for (const season of seasons || []) {
    for (const episode of season?.episodes || []) {
      if (episode?.videoUrl) {
        return episode.videoUrl;
      }
    }
  }
  return '';
}

function sanitizeManualContentPayload(payload = {}, existingItem = null) {
  const nextType = String(payload.type || existingItem?.type || 'movie').toLowerCase();
  const nextPayload = { ...payload, type: nextType };

  if (nextType === 'movie') {
    const effectiveSeasons = Array.isArray(payload.seasons)
      ? payload.seasons
      : Array.isArray(existingItem?.seasons) ? existingItem.seasons : [];
    const fallbackVideoUrl = payload.videoUrl
      || existingItem?.videoUrl
      || pickMovieVideoUrlFromSeasons(effectiveSeasons);

    return {
      ...nextPayload,
      videoUrl: fallbackVideoUrl || '',
      seasons: [],
      seasonCount: 0,
      episodeCount: 0,
      collection: payload.collection || (existingItem?.collection === 'Series' ? 'Movies' : (existingItem?.collection || 'Movies')),
    };
  }

  const nextSeasons = Array.isArray(payload.seasons)
    ? payload.seasons
    : Array.isArray(existingItem?.seasons) ? existingItem.seasons : [];

  return {
    ...nextPayload,
    seasons: nextSeasons,
    seasonCount: nextSeasons.length,
    episodeCount: nextSeasons.reduce((sum, season) => sum + ((season?.episodes || []).length), 0),
    collection: payload.collection || existingItem?.collection || 'Series',
  };
}

function toSummaryItem(item) {
  const poster = item.poster || item.backdrop || item.thumbnail || '';
  return {
    id: item.id,
    title: item.title,
    titleKey: item.titleKey || '',
    type: item.type,
    status: item.status,
    sourceType: item.sourceType,
    sourceRootId: item.sourceRootId || '',
    sourceRootLabel: item.sourceRootLabel || '',
    sourcePath: item.sourcePath || '',
    language: item.language || '',
    category: item.category || '',
    collection: item.collection || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    year: item.year || null,
    metadataStatus: item.metadataStatus || 'pending',
    metadataConfidence: Number(item.metadataConfidence || 0),
    metadataUpdatedAt: item.metadataUpdatedAt || '',
    duplicateCount: Number(item.duplicateCount || 0),
    duplicateCandidates: Array.isArray(item.duplicateCandidates) ? item.duplicateCandidates : [],
    featured: Boolean(item.featured),
    featuredOrder: Number(item.featuredOrder || 0),
    trendingScore: Number(item.trendingScore || 0),
    adminNotes: item.adminNotes || '',
    poster,
    backdrop: item.backdrop || item.poster || '',
    videoUrl: item.videoUrl || '',
    updatedAt: item.updatedAt || '',
    seasonCount: Number(item.seasonCount || 0),
    episodeCount: Number(item.episodeCount || 0),
    seasonsMeta: (item.seasons || []).map((s) => ({
      number: Number(s.number || 0),
      title: s.title || '',
      episodeCount: (s.episodes || []).length,
    })),
  };
}

function withSummaryResult(result, summaryRequested) {
  if (!summaryRequested) return result;
  return {
    ...result,
    items: (result.items || []).map(toSummaryItem),
  };
}

exports.getDashboard = async (req, res) => {
  const stats = await getStats();
  const recentContent = await getRecentItems(8);
  const { items: scannerDrafts } = await listItems({ source: 'scanner', status: 'draft' }, 0, 12);
  const allUsers = await listUsers();
  const scannerHealth = await getScannerHealth();

  res.json({
    stats: {
      ...stats,
      totalAdminUsers: allUsers.length,
    },
    recentContent,
    scannerDrafts,
    scannerRoots: listScannerRoots(),
    scannerHealth: {
      totalRoots: scannerHealth.totalRoots,
      healthyRoots: scannerHealth.healthyRoots,
      brokenRoots: scannerHealth.brokenRoots,
      currentJob: scannerHealth.currentJob,
    },
  });
};

exports.getStats = async (req, res) => {
  res.json(await getStats());
};

exports.getContentList = async (req, res) => {
  const { status, type, source, sourceRootId, language, category, collection, tag, search, sort, page, limit, summary, duplicatesOnly } = req.query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 50;
  const offset = (pageNum - 1) * limitNum;
  const result = await listItems({
    status,
    type,
    source,
    sourceRootId,
    language,
    category,
    collection,
    tag,
    search,
    duplicatesOnly: String(duplicatesOnly) === 'true',
  }, offset, limitNum, sort || 'latest', false);
  res.json(withSummaryResult(result, String(summary) === 'true'));
};

exports.getMovies = async (req, res) => {
  req.query.type = 'movie';
  return exports.getContentList(req, res);
};

exports.getSeries = async (req, res) => {
  req.query.type = 'series';
  return exports.getContentList(req, res);
};

exports.getLibraryOrganization = async (req, res) => {
  const { status, type, source, sourceRootId, language, category, collection, tag, search } = req.query;
  res.json(await getLibraryOrganization({ status, type, source, sourceRootId, language, category, collection, tag, search }));
};

exports.getContentById = async (req, res) => {
  const item = await getItemById(req.params.id);
  if (!item) throw new AppError('Content not found', 404, 'NOT_FOUND');
  return res.json(item);
};

exports.createContent = async (req, res) => {
  const { title, type = 'movie' } = req.body;
  if (!title) throw new AppError('Title is required', 400, 'BAD_REQUEST');

  const sanitizedPayload = sanitizeManualContentPayload(req.body);
  const item = await createItem({
    ...sanitizedPayload,
    slug: req.body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    type,
    sourceType: 'manual',
  });
  return res.status(201).json(item);
};

exports.updateContent = async (req, res) => {
  const current = await getItemById(req.params.id);
  if (!current) throw new AppError('Content not found', 404, 'NOT_FOUND');
  const sanitizedPayload = sanitizeManualContentPayload(req.body, current);
  const item = await updateItem(req.params.id, sanitizedPayload);
  if (!item) throw new AppError('Content not found', 404, 'NOT_FOUND');
  return res.json(item);
};

exports.bulkUpdateContent = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const changes = req.body?.changes || {};
  if (!ids.length) throw new AppError('At least one content id is required.', 400, 'BAD_REQUEST');

  const updated = (await Promise.all(ids.map((id) => updateItem(id, changes)))).filter(Boolean);
  return res.json({ updatedCount: updated.length, items: updated });
};

exports.deleteContent = async (req, res) => {
  const removed = await deleteItem(req.params.id);
  if (!removed) throw new AppError('Content not found', 404, 'NOT_FOUND');
  return res.status(204).send();
};

exports.publishContent = async (req, res) => {
  const item = await updateItem(req.params.id, { status: 'published' });
  if (!item) throw new AppError('Content not found', 404, 'NOT_FOUND');
  return res.json(item);
};

exports.unpublishContent = async (req, res) => {
  const item = await updateItem(req.params.id, { status: 'draft' });
  if (!item) throw new AppError('Content not found', 404, 'NOT_FOUND');
  return res.json(item);
};

exports.pruneCatalog = async (req, res) => {
  res.json(await pruneCatalog());
};

exports.vacuumDatabase = async (req, res) => {
  res.json(await vacuumDatabase());
};

exports.recalculateDuplicateCounts = async (req, res) => {
  res.json(await recalculateDuplicateCounts());
};

exports.cleanupOrphanedScannerRoots = async (req, res) => {
  res.json(await cleanupOrphanedRootItems());
};

exports.uploadPoster = async (req, res, next) => {
  try {
    const assetUrl = req.file ? await saveBufferAsset(req.file, 'posters') : await saveDataUrlAsset(req.body?.dataUrl, 'posters');
    res.status(201).json({ url: assetUrl });
  } catch (error) {
    next(new AppError(error.message || 'Poster upload failed.', 400, 'BAD_REQUEST'));
  }
};

exports.uploadBanner = async (req, res, next) => {
  try {
    const assetUrl = req.file ? await saveBufferAsset(req.file, 'banners') : await saveDataUrlAsset(req.body?.dataUrl, 'banners');
    res.status(201).json({ url: assetUrl });
  } catch (error) {
    next(new AppError(error.message || 'Banner upload failed.', 400, 'BAD_REQUEST'));
  }
};

exports.getScannerRoots = (req, res) => {
  res.json({ items: listScannerRoots() });
};

exports.getScannerDrafts = async (req, res) => {
  const latestOnly = req.query.latestOnly !== 'false';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const latestRunId = latestOnly ? getScannerRuns(1)[0]?.id : '';
  const result = await listItems({
    source: 'scanner',
    status: req.query.status || 'draft',
    ...(latestRunId ? { scanRunId: latestRunId } : {}),
  }, offset, limit);
  res.json({
    ...result,
    page,
    limit,
    hasMore: page * limit < Number(result.total || 0),
  });
};


exports.getScannerLogs = (req, res) => {
  const limit = Number(req.query.limit || 10);
  const runs = getScannerRuns(limit);
  res.json({ items: runs, total: runs.length });
};

exports.getScannerHealth = async (req, res) => {
  res.json(await getScannerHealth());
};

exports.clearScannerMetadataCache = async (req, res) => {
  clearMetadataCache();
  res.json({ ok: true, metadataCache: getEnhancedCacheStats() });
};

exports.getCurrentScannerJob = async (req, res) => {
  try {
    const job = await getCurrentScanJob();
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load current scanner job.' });
  }
};

exports.runScanner = (req, res) => {
  const rootIds = Array.isArray(req.body?.rootIds) ? req.body.rootIds : [];
  const job = startScanJob(rootIds);
  res.status(202).json({ job });
};

exports.stopScanner = (req, res) => {
  const job = stopScanJob();
  res.status(202).json({ job });
};

exports.getDbHealth = async (req, res) => {
  const [sizeResult] = await Promise.all([
    db.query('SELECT pg_size_pretty(pg_database_size(current_database())) AS size_pretty'),
  ]);

  res.json({
    checkedAt: new Date().toISOString(),
    database: process.env.DB_NAME || 'isp_entertainment',
    pool: {
      total: db.pool.totalCount,
      idle: db.pool.idleCount,
      waiting: db.pool.waitingCount,
    },
    databaseSize: sizeResult.rows[0]?.size_pretty || 'unknown',
  });
};

// User management
exports.listAdminUsers = async (req, res) => {
  res.json(await listUsers());
};

exports.createAdminUser = async (req, res) => {
  const { username, ***REMOVED***, role } = req.body || {};
  res.status(201).json(await createUser(username, ***REMOVED***, role));
};

exports.updateAdminUser = async (req, res) => {
  const id = req.params.id;
  res.json(await updateUser(id, req.body || {}));
};

exports.deleteAdminUser = async (req, res) => {
  const id = req.params.id;
  res.json(await deleteUser(id));
};

exports.getDuplicatesReport = (req, res) => {
  res.json(getDuplicateReviewReport());
};

exports.getCatalogDuplicates = async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const minGroupSize = Math.max(1, Number(req.query.minGroupSize) || 2);
  const report = await getCatalogDuplicateGroups({ db, limit, minGroupSize });
  res.json(report);
};

exports.runDuplicatesCleanup = (req, res) => {
  const body = req.body || {};
  const result = runDuplicateCleanup({
    dryRun: body.dryRun === true || req.query.dry === 'true' || req.query.dry === '1',
    onlyPaths: Array.isArray(body.onlyPaths) ? body.onlyPaths : [],
  });
  res.status(202).json(result);
};

exports.mergeCatalogDuplicates = async (req, res) => {
  const { syncDuplicateCountsForTitleKey } = require('../data/store/content');
  const { normalizeTitleKey } = require('../data/store/helpers');
  const body = req.body || {};
  const keepId = Number(body.keepId);
  const removeIds = (Array.isArray(body.removeIds) ? body.removeIds : [])
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0 && id !== keepId);
  if (!keepId || !removeIds.length) {
    return res.status(400).json({ ok: false, error: 'keepId and at least one removeId are required' });
  }

  // Fetch the kept item to know its title key for syncing
  const keptResult = await db.query('SELECT payload FROM content_catalog WHERE id = $1', [keepId]);
  const keptItem = keptResult.rows[0]?.payload;

  const placeholders = removeIds.map((_, idx) => `$${idx + 2}`).join(',');
  const delResult = await db.query(
    `DELETE FROM content_catalog WHERE id <> $1 AND id IN (${placeholders})`,
    [keepId, ...removeIds],
  );

  // Sync duplicate counts for the title-key group
  if (keptItem) {
    const titleKey = keptItem.titleKey || normalizeTitleKey(keptItem.title);
    await syncDuplicateCountsForTitleKey(keptItem.type || keptItem.content_type, titleKey);
  }

  res.json({ ok: true, keepId, removedCount: delResult.rowCount || 0 });
};

exports.checkDuplicateTitle = async (req, res) => {
  const { normalizeTitleKey } = require('../data/store/helpers');
  const title = String(req.query.title || '').trim();
  const type = String(req.query.type || 'movie').toLowerCase();
  const excludeId = Number(req.query.excludeId) || 0;
  if (!title) return res.json({ candidates: [], normalizedKey: '' });
  const titleKey = normalizeTitleKey(title);
  if (!titleKey) return res.json({ candidates: [], normalizedKey: '' });
  const params = [type, titleKey];
  let excludeClause = '';
  if (excludeId > 0) {
    params.push(excludeId);
    excludeClause = `AND id <> $${params.length}`;
  }
  params.push(20);
  const result = await db.query(
    `SELECT id, title, status, source_type, source_root_id, year, payload
     FROM content_catalog
     WHERE content_type = $1 AND title_key = $2 ${excludeClause}
     ORDER BY id ASC
     LIMIT $${params.length}`,
    params,
  );
  res.json({
    normalizedKey: titleKey,
    candidates: result.rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      status: row.status,
      sourceType: row.source_type,
      sourceRootId: row.source_root_id || '',
      year: row.year,
      sourcePath: row.payload?.sourcePath || '',
    })),
  });
};

exports.fetchTmdbMetadata = async (req, res) => {
  const inputId = String(req.body?.tmdbId || '').trim();
  const mediaType = req.body?.type || 'movie';
  if (!inputId) throw new AppError('Valid TMDb or IMDb ID is required.', 400, 'BAD_REQUEST');

  let metadata;
  if (inputId.toLowerCase().startsWith('tt')) {
    metadata = await fetchMetadataByImdbId(inputId, mediaType);
  } else {
    const tmdbId = Number(inputId);
    if (isNaN(tmdbId)) {
      throw new AppError('Invalid TMDb ID format.', 400, 'BAD_REQUEST');
    }
    metadata = await fetchMetadataByTmdbId(tmdbId, mediaType);
  }
  return res.json({ metadata });
};

exports.getSearchAnalytics = async (req, res) => {
  try {
    const topSearches = await db.query(`
      SELECT query, COUNT(*) as count, MAX(results_count) as results_count 
      FROM search_analytics 
      GROUP BY query 
      ORDER BY count DESC 
      LIMIT 10
    `);
    const zeroResults = await db.query(`
      SELECT query, COUNT(*) as count 
      FROM search_analytics 
      WHERE results_count = 0 
      GROUP BY query 
      ORDER BY count DESC 
      LIMIT 10
    `);
    res.json({
      topSearches: topSearches.rows.map(r => ({ query: r.query, count: Number(r.count), resultsCount: Number(r.results_count) })),
      zeroResults: zeroResults.rows.map(r => ({ query: r.query, count: Number(r.count) }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rematchMetadata = async (req, res) => {
  const { enrichItemWithMetadata } = require('../services/scanner-enhanced-metadata');
  const dryRun = req.query.dry === 'true' || req.query.dry === '1';
  const batchSize = Math.min(20, Math.max(1, Number(req.body?.batchSize || 5)));

  const queryResult = await db.query(
    `SELECT id, payload FROM content_catalog
     WHERE metadata_status IN ('skipped', 'needs_review', 'not_found', 'failed')
     ORDER BY id`,
  );

  const total = queryResult.rows.length;
  let matched = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < queryResult.rows.length; i += batchSize) {
    const batch = queryResult.rows.slice(i, i + batchSize);
    await Promise.all(batch.map(async (row) => {
      try {
        const item = row.payload;
        const enriched = await enrichItemWithMetadata(item);

        if (!dryRun) {
          await updateItem(item.id, enriched);
        }

        matched++;
      } catch (err) {
        failed++;
        errors.push({ id: row.id, error: err.message });
      }
    }));
  }

  res.json({ ok: true, dryRun, total, matched, failed, errors: errors.slice(0, 50) });
};

/**
 * Fix published items that are missing poster, backdrop, description, or year.
 * Also fixes items with non-HTTP (local/broken) poster/backdrop URLs.
 * Searches TMDB by title and fills in whatever is missing or broken.
 * POST /api/admin/metadata/fix-missing-posters
 */
exports.fixMissingPosters = async (req, res) => {
  const { enrichItemWithMetadata } = require('../services/scanner-enhanced-metadata');
  const dryRun = req.query.dry === 'true' || req.query.dry === '1';
  const batchSize = Math.min(20, Math.max(1, Number(req.body?.batchSize || 5)));
  const statusFilter = String(req.body?.status || 'published');

  // Find published items missing or with broken (non-http) poster/backdrop/description/year
  const queryResult = await db.query(
    `SELECT id, payload FROM content_catalog
     WHERE status = $1
       AND (
         payload->>'poster' IS NULL OR payload->>'poster' = ''
           OR (payload->>'poster' NOT LIKE 'http%'
               AND payload->>'poster' NOT LIKE '/portal/uploads%'
               AND payload->>'poster' NOT LIKE '/uploads%')
         OR payload->>'backdrop' IS NULL OR payload->>'backdrop' = ''
           OR (payload->>'backdrop' NOT LIKE 'http%'
               AND payload->>'backdrop' NOT LIKE '/portal/uploads%'
               AND payload->>'backdrop' NOT LIKE '/uploads%')
         OR payload->>'description' IS NULL OR payload->>'description' = ''
         OR payload->>'year' IS NULL
       )
     ORDER BY id`,
    [statusFilter],
  );

  const total = queryResult.rows.length;
  let fixed = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];
  const fixedList = [];

  // Helper: is a URL a valid remote or uploaded image?
  function isGoodUrl(url) {
    if (!url) return false;
    return url.startsWith('http') || url.startsWith('/portal/uploads') || url.startsWith('/uploads');
  }

  for (let i = 0; i < queryResult.rows.length; i += batchSize) {
    const batch = queryResult.rows.slice(i, i + batchSize);
    await Promise.all(batch.map(async (row) => {
      try {
        const item = row.payload;
        if (!item || !item.title) { skipped++; return; }

        const enriched = await enrichItemWithMetadata(item);

        // Replace if current value is missing OR is a broken/local path
        const needsPoster = !isGoodUrl(item.poster);
        const needsBackdrop = !isGoodUrl(item.backdrop);
        const needsDescription = !item.description;
        const needsYear = !item.year;

        const gotPoster = needsPoster && isGoodUrl(enriched.poster);
        const gotBackdrop = needsBackdrop && isGoodUrl(enriched.backdrop);
        const gotDescription = needsDescription && !!enriched.description;
        const gotYear = needsYear && !!enriched.year;

        if (!gotPoster && !gotBackdrop && !gotDescription && !gotYear) {
          skipped++;
          return;
        }

        if (!dryRun) {
          await updateItem(item.id, {
            ...enriched,
            poster: gotPoster ? enriched.poster : item.poster,
            backdrop: gotBackdrop ? enriched.backdrop : item.backdrop,
            description: gotDescription ? enriched.description : item.description,
            year: gotYear ? enriched.year : item.year,
            rating: item.rating || enriched.rating,
          });
        }

        fixedList.push({
          id: item.id,
          title: item.title,
          oldPoster: item.poster,
          newPoster: gotPoster ? enriched.poster : null,
          addedBackdrop: gotBackdrop,
          addedDescription: gotDescription,
          addedYear: gotYear,
        });
        fixed++;
      } catch (err) {
        failed++;
        errors.push({ id: row.id, error: err.message });
      }
    }));
  }

  res.json({
    ok: true,
    dryRun,
    total,
    fixed,
    skipped,
    failed,
    fixedList: fixedList.slice(0, 200),
    errors: errors.slice(0, 50),
  });
};

exports.cleanupSeasonDuplicates = async (req, res) => {
  const dryRun = req.query.dry === 'true' || req.query.dry === '1';
  const seasonPattern = '%/Season %';

  const queryResult = await db.query(
    `SELECT id, title, payload->>'sourcePath' AS source_path, payload FROM content_catalog
     WHERE content_type = 'series'
       AND (payload->>'sourcePath' ILIKE $1 OR payload->>'sourcePath' ~ '/S\d{2}(/|$)')
     ORDER BY id`,
    [seasonPattern],
  );

  const total = queryResult.rows.length;
  let deleted = 0;
  const entries = queryResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    sourcePath: row.source_path,
    payloadTitle: row.payload?.title || '',
  }));

  if (!dryRun && total > 0) {
    const ids = entries.map((e) => e.id);
    const placeholders = ids.map((_, idx) => `$${idx + 1}`).join(',');
    await db.query(`DELETE FROM content_catalog WHERE id IN (${placeholders})`, ids);
    deleted = total;
  }

  res.json({ ok: true, dryRun, total, deleted, entries });
};

async function cleanupOrphanSeriesEpisodes(req, res) {
  const { cleanupOrphanEpisodeEntries } = require('../data/store/content');
  try {
    const deletedCount = await cleanupOrphanEpisodeEntries();
    res.json({ ok: true, deletedCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports.cleanupOrphanSeriesEpisodes = cleanupOrphanSeriesEpisodes;

/**
 * Extract the actual show title from a sourcePath like:
 *   /var/www/html/New_Movies_1/Made in Heaven (TV Series 2019)/Season 02
 * Returns "Made in Heaven" — stripping year, noise, and season folder.
 */
function extractShowTitleFromPath(sourcePath, itemTitle) {
  // If the item title is already meaningful (not a season label), use it
  if (itemTitle && !/^\s*season\s+\d+/i.test(itemTitle) && itemTitle.length > 4) {
    // But also clean out "(TV Series YYYY)" etc. from the title
    return itemTitle
      .replace(/\s*\(TV\s*(Mini\s*)?Series[^)]*\)\s*/gi, '')
      .replace(/\s*\(\d{4}(?:[–-]\s*)?\)\s*$/, '')
      .replace(/\s*\[\w+\]\s*$/, '')
      .trim();
  }

  if (!sourcePath) return itemTitle;

  const parts = sourcePath.replace(/\\/g, '/').split('/').filter(Boolean);

  // Walk backwards: skip season-like folders, take first non-season meaningful segment
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i];
    // Skip season-like folder names
    if (/^\s*season\s+\d+/i.test(seg)) continue;
    if (/^s\d{1,2}$/i.test(seg)) continue;
    if (/^\d{1,2}$/.test(seg)) continue;
    // Skip root-like folder names (too short or common catch-alls)
    if (/^(New_Movies_[0-9]+|html|var|www|media|content|videos?)$/i.test(seg)) continue;
    if (seg.length < 3) continue;

    // Strip year suffix and TV Series noise
    const cleaned = seg
      .replace(/\s*\(TV\s*(Mini\s*)?Series[^)]*\)\s*/gi, '')
      .replace(/\s*\(\d{4}(?:[–\-]\s*)?\)\s*$/, '')
      .replace(/\s*\[\w+\]\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length > 2) return cleaned;
  }

  return itemTitle;
}

exports.fixSeriesMetadata = async (req, res) => {
  const { enrichItemWithMetadata } = require('../services/scanner-enhanced-metadata');
  const dryRun = req.query.dry === 'true' || req.query.dry === '1';
  const batchSize = Math.min(10, Math.max(1, Number(req.body?.batchSize || 5)));
  const statusFilter = req.body?.statusFilter || ['skipped', 'not_found', 'failed', 'needs_review'];

  const placeholders = statusFilter.map((_, i) => `$${i + 1}`).join(',');
  const queryResult = await db.query(
    `SELECT id, payload FROM content_catalog
     WHERE content_type = 'series'
       AND metadata_status IN (${placeholders})
     ORDER BY id`,
    statusFilter,
  );

  const total = queryResult.rows.length;
  let matched = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];
  const fixedTitles = [];

  for (let i = 0; i < queryResult.rows.length; i += batchSize) {
    const batch = queryResult.rows.slice(i, i + batchSize);
    await Promise.all(batch.map(async (row) => {
      try {
        const item = row.payload;
        if (!item) { skipped++; return; }

        // Extract the real show title from the source path
        const extractedTitle = extractShowTitleFromPath(item.sourcePath || '', item.title || '');
        const enrichInput = {
          ...item,
          title: extractedTitle,
        };

        const enriched = await enrichItemWithMetadata(enrichInput);

        if (!dryRun) {
          await updateItem(item.id, {
            ...enriched,
            // Preserve the original seasons (file-based episodes) if TMDB didn't provide better ones
            seasons: (enriched.seasons && enriched.seasons.length > 0)
              ? enriched.seasons
              : (item.seasons || []),
          });
        }

        fixedTitles.push({
          id: item.id,
          originalTitle: item.title,
          extractedTitle,
          tmdbTitle: enriched.title,
          confidence: enriched.metadataConfidence,
          status: enriched.metadataStatus,
        });

        matched++;
      } catch (err) {
        failed++;
        errors.push({ id: row.id, error: err.message });
      }
    }));
  }

  res.json({
    ok: true,
    dryRun,
    total,
    matched,
    skipped,
    failed,
    fixedTitles: fixedTitles.slice(0, 100),
    errors: errors.slice(0, 50),
  });
};

const MOVIE_ROOT_PATTERNS = [
  /movie/i, /cartoon/i, /anim(e|ation)/i, /3d/i,
  /bollywood/i, /hollywood/i, /hindi/i, /tamil/i,
  /telugu/i, /malayalam/i, /kannada/i, /bengali/i,
  /marathi/i, /punjabi/i, /gujarati/i, /odia/i,
];

exports.fixMisconfiguredRoots = async (req, res) => {
  const { refreshScannerCaches } = require('../data/store');
  const dryRun = req.query.dry !== 'false' && req.query.dry !== '0';
  const results = { roots: [], deletedCount: 0 };
  try {
    const rootsResult = await db.query(
      `SELECT id, label, type, category, language, scan_path FROM scanner_roots ORDER BY label`
    );
    for (const row of rootsResult.rows) {
      if (row.type !== 'series') continue;
      if (!MOVIE_ROOT_PATTERNS.some((p) => p.test(row.label))) continue;

      const countResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM content_catalog
         WHERE source_root_id = $1 AND content_type = 'series'`,
        [row.id]
      );
      const entryCount = countResult.rows[0]?.count || 0;
      results.roots.push({ id: row.id, label: row.label, category: row.category, language: row.language, entriesToDelete: entryCount });

      if (!dryRun) {
        await db.query(
          `UPDATE scanner_roots SET type = 'movie', updated_at = NOW() WHERE id = $1`,
          [row.id]
        );
        const delResult = await db.query(
          `DELETE FROM content_catalog WHERE source_root_id = $1 AND content_type = 'series'`,
          [row.id]
        );
        results.deletedCount += delResult.rowCount || 0;
        results.roots[results.roots.length - 1].fixed = true;
      }
    }
    if (!dryRun) {
      await refreshScannerCaches().catch(() => {});
    }
    res.json({ ok: true, dryRun, ...results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.deleteScannerRoot = async (req, res) => {
  const rootId = req.params.id;
  if (!rootId) {
    return res.status(400).json({ ok: false, error: 'Root ID is required.' });
  }

  const currentRoots = loadScannerRoots();
  const rootToDelete = currentRoots.find((r) => r.id === rootId);
  if (!rootToDelete) {
    return res.status(404).json({ ok: false, error: `Root '${rootId}' not found.` });
  }

  const updatedRoots = currentRoots.filter((r) => r.id !== rootId);
  await saveScannerRoots(updatedRoots);
  await refreshScannerCaches();

  await db.query('DELETE FROM content_catalog WHERE source_root_id = $1', [rootId]);

  const scanState = loadScannerState();
  if (scanState?.roots?.[rootId]) {
    delete scanState.roots[rootId];
    await saveScannerState(scanState);
  }

  res.json({ ok: true, deleted: rootToDelete.label || rootId });
};

exports.cleanupStaleScannerRoots = async (req, res) => {
  const dryRun = req.query.dry !== 'false' && req.query.dry !== '0';
  const currentRoots = loadScannerRoots();
  const results = { checked: 0, deleted: 0, dryRun, stale: [] };

  for (const root of currentRoots) {
    results.checked += 1;
    if (root.discovered) continue;

    let exists = false;
    try {
      exists = fs.existsSync(root.scanPath);
    } catch {
      exists = false;
    }

    if (!exists) {
      results.stale.push({ id: root.id, label: root.label, path: root.scanPath });
    }
  }

  if (!dryRun && results.stale.length) {
    const staleIds = results.stale.map((r) => r.id);
    const updatedRoots = currentRoots.filter((r) => !staleIds.includes(r.id));
    await saveScannerRoots(updatedRoots);
    await refreshScannerCaches();
    results.deleted = results.stale.length;

    const scanState = loadScannerState();
    if (scanState?.roots) {
      for (const id of staleIds) {
        delete scanState.roots[id];
      }
      await saveScannerState(scanState);
    }
  }

  res.json({ ok: true, ...results });
};
