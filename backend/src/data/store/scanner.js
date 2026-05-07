const { db, appStateCache, ensureContentStore, setAppState } = require('./base');
const { MAX_SCANNER_RUNS } = require('./constants');
const { toSafeInteger, rowToScannerRoot, rowToScannerRun, normalizeItem, normalizeTitleKey, extractTypedColumns } = require('./helpers');
const { getItemById, getItems, allocateNextCatalogId } = require('./content');

function loadScannerLog() {
  return appStateCache.get('scanner_log') || { runs: [] };
}

async function saveScannerLog(payload) {
  return setAppState('scanner_log', payload);
}

function loadScannerState() {
  return appStateCache.get('scanner_state') || { roots: {} };
}

async function saveScannerState(payload) {
  return setAppState('scanner_state', payload);
}

function loadScannerRuntime() {
  return appStateCache.get('scanner_runtime') || { currentJob: null, queue: [] };
}

async function saveScannerRuntime(payload) {
  return setAppState('scanner_runtime', payload);
}

function loadScannerRoots() {
  return appStateCache.get('scanner_roots') || [];
}

async function saveScannerRoots(roots) {
  await ensureContentStore();
  const rootsArray = Array.isArray(roots) ? roots : [];
  const incomingIds = rootsArray.map((r) => String(r.id || '')).filter(Boolean);
  if (incomingIds.length) {
    await db.query('DELETE FROM scanner_roots WHERE id <> ALL($1::text[])', [incomingIds]);
  } else {
    await db.query('DELETE FROM scanner_roots');
  }
  for (const root of rootsArray) {
    await db.query(
      `INSERT INTO scanner_roots (id, label, scan_path, public_base_url, type, language, category, max_depth, batch_size, enabled, discovered, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, scan_path = EXCLUDED.scan_path, public_base_url = EXCLUDED.public_base_url, type = EXCLUDED.type, language = EXCLUDED.language, category = EXCLUDED.category, max_depth = EXCLUDED.max_depth, batch_size = EXCLUDED.batch_size, enabled = EXCLUDED.enabled, discovered = EXCLUDED.discovered, updated_at = NOW()`,
      [String(root.id || ''), String(root.label || ''), String(root.scanPath || ''), String(root.publicBaseUrl || ''), String(root.type || 'movie'), String(root.language || ''), String(root.category || ''), root.maxDepth != null ? Number(root.maxDepth) : null, root.batchSize != null ? Number(root.batchSize) : null, root.enabled !== false, Boolean(root.discovered)]
    );
  }
  appStateCache.set('scanner_roots', rootsArray);
  return rootsArray;
}

async function refreshScannerCaches() {
  await ensureContentStore();
  const [rootsResult, runsResult, stateResult] = await Promise.all([
    db.query('SELECT * FROM scanner_roots ORDER BY created_at ASC'),
    db.query('SELECT * FROM scanner_runs ORDER BY created_at DESC LIMIT $1', [MAX_SCANNER_RUNS]),
    db.query("SELECT value FROM app_state WHERE key = 'scanner_state' LIMIT 1"),
  ]);
  const roots = rootsResult.rows.map(rowToScannerRoot);
  const log = { runs: runsResult.rows.map(rowToScannerRun) };
  const state = stateResult.rows[0]?.value || { roots: {} };
  appStateCache.set('scanner_roots', roots);
  appStateCache.set('scanner_log', log);
  appStateCache.set('scanner_state', state);
  return { roots, log, state };
}

async function recordScannerRun(entry) {
  await ensureContentStore();
  await db.query(
    `INSERT INTO scanner_runs (id, status, started_at, completed_at, root_ids, roots_requested, roots_scanned, total_created, total_updated, total_deleted, total_unchanged, total_duplicate_drafts, skipped, errors, root_results, error, created_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, completed_at = EXCLUDED.completed_at, roots_scanned = EXCLUDED.roots_scanned, total_created = EXCLUDED.total_created, total_updated = EXCLUDED.total_updated, total_deleted = EXCLUDED.total_deleted, total_unchanged = EXCLUDED.total_unchanged, total_duplicate_drafts = EXCLUDED.total_duplicate_drafts, skipped = EXCLUDED.skipped, errors = EXCLUDED.errors, root_results = EXCLUDED.root_results, error = EXCLUDED.error`,
    [String(entry.id || ''), String(entry.status || 'completed'), entry.startedAt || null, entry.completedAt || null, JSON.stringify(entry.rootIds || []), toSafeInteger(entry.rootsRequested), toSafeInteger(entry.rootsScanned), toSafeInteger(entry.created), toSafeInteger(entry.updated), toSafeInteger(entry.deleted), toSafeInteger(entry.unchanged), toSafeInteger(entry.duplicateDrafts), JSON.stringify(entry.skipped || []), JSON.stringify(entry.errors || []), JSON.stringify(entry.rootResults || []), entry.error || null, entry.startedAt || new Date().toISOString()]
  );
  const current = appStateCache.get('scanner_log') || { runs: [] };
  const runs = [entry, ...(current.runs || []).filter((r) => r.id !== entry.id)].slice(0, MAX_SCANNER_RUNS);
  appStateCache.set('scanner_log', { runs });
  return entry;
}

function getScannerRuns(limit = 10) {
  return (loadScannerLog().runs || []).slice(0, limit);
}

async function getItemByScanSignature(scanSignature) {
  await ensureContentStore();
  const result = await db.query("SELECT payload FROM content_catalog WHERE payload->>'scanSignature' = $1 LIMIT 1", [String(scanSignature || '')]);
  const payload = result.rows[0]?.payload;
  return payload ? normalizeItem(payload) : null;
}

async function getScanSignaturesByRootId(sourceRootId) {
  await ensureContentStore();
  const rootId = String(sourceRootId || '').trim();
  if (!rootId) {
    return [];
  }

  const result = await db.query(
    `SELECT DISTINCT payload->>'scanSignature' AS scan_signature
     FROM content_catalog
     WHERE source_type = $1
       AND source_root_id = $2
       AND COALESCE(payload->>'scanSignature', '') <> ''`,
    ['scanner', rootId],
  );

  return result.rows
    .map((row) => String(row.scan_signature || '').trim())
    .filter(Boolean);
}


async function deleteItemsByScanSignatures(scanSignatures = []) {
  const signatures = new Set((scanSignatures || []).filter(Boolean));
  if (!signatures.size) return 0;
  await ensureContentStore();
  const result = await db.query("DELETE FROM content_catalog WHERE payload->>'scanSignature' = ANY($1::text[])", [[...signatures]]);
  return result.rowCount || 0;
}

async function upsertScannedItem(payload) {
  const now = new Date().toISOString();
  if (!payload || !['movie', 'series'].includes(String(payload.type || '').toLowerCase())) {
    throw new Error(`Unsupported scanner content type: ${payload?.type || 'unknown'}`);
  }
  await ensureContentStore();
  const existing = await db.query("SELECT id, payload FROM content_catalog WHERE payload->>'scanSignature' = $1 LIMIT 1", [payload.scanSignature]);
  const current = existing.rows[0]?.payload || null;

  // ── NEW ITEM ──────────────────────────────────────────────────────────────
  if (!current) {
    const shouldAutoPublish = payload.metadataStatus === 'matched';
    const nextStatus = payload.status
      || (shouldAutoPublish ? (process.env.SCANNER_DEFAULT_STATUS || 'published') : 'draft');
    const nextPublishedAt = nextStatus === 'published' ? (payload.publishedAt || now) : '';

    const item = normalizeItem({
      id: await allocateNextCatalogId(),
      createdAt: now,
      updatedAt: now,
      sourceType: 'scanner',
      ...payload,
      titleKey: normalizeTitleKey(payload.title),
      status: nextStatus,
      publishedAt: nextPublishedAt,
      lastScanRunId: payload.lastScanRunId || '',
      lastScanRunAt: payload.lastScanRunAt || now,
    });
    const insertCols = extractTypedColumns(item);
    await db.query(
      `INSERT INTO content_catalog
        (id, payload, created_at, updated_at, status, content_type, title, title_key,
         language, category, collection, source_type, source_root_id, last_scan_run_id,
         year, rating, featured, featured_order, trending_score, duplicate_count,
         metadata_status, published_at, released_at)
       VALUES ($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [item.id, JSON.stringify(item), now, now,
       insertCols.status, insertCols.content_type, insertCols.title, insertCols.title_key,
       insertCols.language, insertCols.category, insertCols.collection,
       insertCols.source_type, insertCols.source_root_id, insertCols.last_scan_run_id,
       insertCols.year, insertCols.rating, insertCols.featured, insertCols.featured_order,
       insertCols.trending_score, insertCols.duplicate_count, insertCols.metadata_status,
       insertCols.published_at, insertCols.released_at],
    );
    return { item: await getItemById(item.id), created: true, updated: false };
  }

  // ── EXISTING ITEM — preserve user-managed fields ─────────────────────────
  // Fields that the admin may have manually edited must NOT be overwritten by
  // scanner re-runs.  Only update scan-derived technical fields.
  const isUserManaged = current.status === 'published' || current.status === 'archived';
  const preservedStatus     = isUserManaged ? current.status    : (payload.status || current.status || 'draft');
  const preservedPublishedAt = preservedStatus === 'published'
    ? (current.publishedAt || payload.publishedAt || now)
    : (current.publishedAt || '');

  // Fields always preserved from existing record (admin edits)
  const adminPreserved = {
    adminNotes:     current.adminNotes     || '',
    featuredOrder:  current.featuredOrder  != null ? current.featuredOrder  : 0,
    featured:       current.featured       != null ? current.featured       : false,
    trendingScore:  current.trendingScore  != null ? current.trendingScore  : 0,
    editorialScore: current.editorialScore != null ? current.editorialScore : 0,
    tags:           Array.isArray(current.tags) && current.tags.length ? current.tags : payload.tags || [],
    collection:     current.collection     || payload.collection || '',
    category:       current.category       || payload.category   || '',
  };

  // For metadata: only update if scan found a better match or current is pending
  const shouldUpdateMetadata = !isUserManaged
    || current.metadataStatus === 'pending'
    || current.metadataStatus === 'not_found';
  const metaFields = shouldUpdateMetadata
    ? {
        tmdbId:              payload.tmdbId              || current.tmdbId,
        imdbId:              payload.imdbId              || current.imdbId,
        description:         payload.description         || current.description || '',
        genres:              payload.genres?.length ? payload.genres : (current.genres || []),
        metadataStatus:      payload.metadataStatus      || current.metadataStatus,
        metadataProvider:    payload.metadataProvider    || current.metadataProvider || '',
        metadataConfidence:  payload.metadataConfidence  ?? current.metadataConfidence,
        metadataUpdatedAt:   payload.metadataUpdatedAt   || current.metadataUpdatedAt || '',
        rating:              payload.rating              ?? current.rating,
        year:                payload.year                ?? current.year,
        originalTitle:       payload.originalTitle       || current.originalTitle || '',
        originalLanguage:    payload.originalLanguage    || current.originalLanguage || '',
      }
    : {
        tmdbId:             current.tmdbId,
        imdbId:             current.imdbId,
        description:        current.description || '',
        genres:             current.genres || [],
        metadataStatus:     current.metadataStatus,
        metadataProvider:   current.metadataProvider || '',
        metadataConfidence: current.metadataConfidence,
        metadataUpdatedAt:  current.metadataUpdatedAt || '',
        rating:             current.rating,
        year:               current.year,
        originalTitle:      current.originalTitle || '',
        originalLanguage:   current.originalLanguage || '',
      };

  const item = normalizeItem({
    ...current,
    // scan-derived fields (always refreshed)
    title:            payload.title            || current.title,
    titleKey:         normalizeTitleKey(payload.title || current.title),
    slug:             payload.slug             || current.slug || '',
    poster:           payload.poster           || current.poster || '',
    backdrop:         payload.backdrop         || current.backdrop || '',
    videoUrl:         payload.videoUrl         || current.videoUrl || '',
    sourcePath:       payload.sourcePath       || current.sourcePath || '',
    sourcePublicPath: payload.sourcePublicPath || current.sourcePublicPath || '',
    seasons:          payload.seasons          || current.seasons || [],
    seasonCount:      payload.seasonCount      ?? current.seasonCount ?? 0,
    episodeCount:     payload.episodeCount     ?? current.episodeCount ?? 0,
    sourceRootId:     payload.sourceRootId     || current.sourceRootId || '',
    sourceRootLabel:  payload.sourceRootLabel  || current.sourceRootLabel || '',
    language:         current.language         || payload.language || '',
    lastScanRunId:    payload.lastScanRunId    || current.lastScanRunId || '',
    lastScanRunAt:    payload.lastScanRunAt    || now,
    lastScannedAt:    now,
    // metadata fields
    ...metaFields,
    // admin-preserved fields
    ...adminPreserved,
    // locked fields
    id:          current.id,
    createdAt:   current.createdAt || now,
    updatedAt:   now,
    sourceType:  'scanner',
    status:      preservedStatus,
    publishedAt: preservedPublishedAt,
  });

  // Skip DB write entirely if nothing meaningful changed
  const scanFieldsChanged = item.title        !== current.title
    || item.poster       !== (current.poster || '')
    || item.videoUrl     !== (current.videoUrl || '')
    || item.sourcePath   !== (current.sourcePath || '')
    || item.seasonCount  !== (current.seasonCount ?? 0)
    || item.episodeCount !== (current.episodeCount ?? 0)
    || item.lastScanRunId !== (current.lastScanRunId || '')
    || (shouldUpdateMetadata && item.metadataStatus !== current.metadataStatus);

  if (!scanFieldsChanged) {
    return { item: normalizeItem(current), created: false, updated: false };
  }

  const updateCols = extractTypedColumns(item);
  await db.query(
    `UPDATE content_catalog
     SET payload = $2::jsonb, updated_at = NOW(), status = $3, content_type = $4,
         title = $5, title_key = $6, language = $7, category = $8, collection = $9,
         source_type = $10, source_root_id = $11, last_scan_run_id = $12,
         year = $13, rating = $14, featured = $15, featured_order = $16,
         trending_score = $17, duplicate_count = $18, metadata_status = $19,
         published_at = $20, released_at = $21
     WHERE id = $1`,
    [item.id, JSON.stringify(item),
     updateCols.status, updateCols.content_type, updateCols.title, updateCols.title_key,
     updateCols.language, updateCols.category, updateCols.collection,
     updateCols.source_type, updateCols.source_root_id, updateCols.last_scan_run_id,
     updateCols.year, updateCols.rating, updateCols.featured, updateCols.featured_order,
     updateCols.trending_score, updateCols.duplicate_count, updateCols.metadata_status,
     updateCols.published_at, updateCols.released_at],
  );
  return { item: await getItemById(item.id), created: false, updated: true };
}

async function deleteScannerItemsNotInSignatures(sourceRootId, scanSignatures = []) {
  const rootId = String(sourceRootId || '').trim();
  if (!rootId) return 0;
  const signatures = [...new Set((scanSignatures || []).filter(Boolean))];

  // SAFE DELETE: only remove items that are NOT user-managed (draft/pending).
  // published, archived items are NEVER auto-deleted — admin must remove manually.
  // This prevents the create/delete loop when media paths fluctuate.
  const PROTECTED_STATUSES = ['published', 'archived'];

  let result;
  if (signatures.length) {
    result = await db.query(
      `DELETE FROM content_catalog
       WHERE source_type = $1
         AND source_root_id = $2
         AND status <> ALL($3::text[])
         AND COALESCE(payload->>'scanSignature', '') <> ALL($4::text[])`,
      ['scanner', rootId, PROTECTED_STATUSES, signatures],
    );
  } else {
    // No signatures seen at all — only delete non-protected items
    result = await db.query(
      `DELETE FROM content_catalog
       WHERE source_type = $1
         AND source_root_id = $2
         AND status <> ALL($3::text[])`,
      ['scanner', rootId, PROTECTED_STATUSES],
    );
  }
  return Number(result.rowCount || 0);
}

async function refreshCatalogReferencesForNormalizedFile(payload = {}) {
  const previousSourcePath = String(payload.previousSourcePath || '').trim();
  const nextSourcePath = String(payload.nextSourcePath || '').trim();
  const previousVideoUrl = String(payload.previousVideoUrl || '').trim();
  const nextVideoUrl = String(payload.nextVideoUrl || '').trim();
  if (!previousSourcePath || !nextSourcePath) return { updatedItems: 0, updatedEpisodes: 0 };
  const items = await getItems();
  let updatedItems = 0; let updatedEpisodes = 0; let mutated = false; const now = new Date().toISOString();
  const nextItems = items.map((item) => {
    let changed = false; const nextItem = { ...item };
    if (nextItem.sourcePath === previousSourcePath) { nextItem.sourcePath = nextSourcePath; changed = true; }
    if (previousVideoUrl && nextItem.videoUrl === previousVideoUrl) { nextItem.videoUrl = nextVideoUrl; changed = true; }
    if (previousVideoUrl && nextItem.sourcePublicPath === previousVideoUrl) { nextItem.sourcePublicPath = nextVideoUrl; changed = true; }
    if (Array.isArray(nextItem.seasons) && nextItem.seasons.length) {
      let seasonChanged = false;
      nextItem.seasons = nextItem.seasons.map((season) => {
        if (!Array.isArray(season?.episodes) || !season.episodes.length) return season;
        let episodeChanged = false;
        const episodes = season.episodes.map((episode) => {
          let localChanged = false; const nextEpisode = { ...episode };
          if (nextEpisode.sourcePath === previousSourcePath) { nextEpisode.sourcePath = nextSourcePath; localChanged = true; }
          if (previousVideoUrl && nextEpisode.videoUrl === previousVideoUrl) { nextEpisode.videoUrl = nextVideoUrl; localChanged = true; }
          if (localChanged) { updatedEpisodes += 1; episodeChanged = true; }
          return localChanged ? nextEpisode : episode;
        });
        if (!episodeChanged) return season;
        seasonChanged = true; return { ...season, episodes };
      });
      if (seasonChanged) changed = true;
    }
    if (!changed) return item;
    updatedItems += 1; mutated = true; return normalizeItem({ ...nextItem, updatedAt: now });
  });
  if (mutated) {
    for (const item of nextItems) {
      const refItem = normalizeItem(item); const refCols = extractTypedColumns(refItem);
      await db.query(`INSERT INTO content_catalog (id, payload, created_at, updated_at, status, content_type, title, title_key, language, category, collection, source_type, source_root_id, last_scan_run_id, year, rating, featured, featured_order, trending_score, duplicate_count, metadata_status, published_at, released_at) VALUES ($1, $2::jsonb, NOW(), NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW(), status = EXCLUDED.status, content_type = EXCLUDED.content_type, title = EXCLUDED.title, title_key = EXCLUDED.title_key, language = EXCLUDED.language, category = EXCLUDED.category, collection = EXCLUDED.collection, source_type = EXCLUDED.source_type, source_root_id = EXCLUDED.source_root_id, last_scan_run_id = EXCLUDED.last_scan_run_id, year = EXCLUDED.year, rating = EXCLUDED.rating, featured = EXCLUDED.featured, featured_order = EXCLUDED.featured_order, trending_score = EXCLUDED.trending_score, duplicate_count = EXCLUDED.duplicate_count, metadata_status = EXCLUDED.metadata_status, published_at = EXCLUDED.published_at, released_at = EXCLUDED.released_at`, [refItem.id, JSON.stringify(refItem), refCols.status, refCols.content_type, refCols.title, refCols.title_key, refCols.language, refCols.category, refCols.collection, refCols.source_type, refCols.source_root_id, refCols.last_scan_run_id, refCols.year, refCols.rating, refCols.featured, refCols.featured_order, refCols.trending_score, refCols.duplicate_count, refCols.metadata_status, refCols.published_at, refCols.released_at]);
    }
  }
  return { updatedItems, updatedEpisodes };
}

module.exports = {
  loadScannerLog,
  saveScannerLog,
  loadScannerState,
  saveScannerState,
  loadScannerRuntime,
  saveScannerRuntime,
  loadScannerRoots,
  saveScannerRoots,
  refreshScannerCaches,
  recordScannerRun,
  getScannerRuns,
  getItemByScanSignature,
  deleteItemsByScanSignatures,
  upsertScannedItem,
  deleteScannerItemsNotInSignatures,
  refreshCatalogReferencesForNormalizedFile,
};
