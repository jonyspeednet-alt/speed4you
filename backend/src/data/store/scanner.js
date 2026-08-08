const fs = require('fs');
const { db, appStateCache, ensureContentStore, setAppState } = require('./base');
const { MAX_SCANNER_RUNS } = require('./constants');
const { toSafeInteger, rowToScannerRoot, rowToScannerRun, normalizeItem, normalizeTitleKey, titlesFuzzyMatch, extractTypedColumns, attachDuplicateMetadata } = require('./helpers');

function loadScannerLog() {
  try {
    const cached = appStateCache.get('scanner_log');
    if (cached && Array.isArray(cached.runs)) {
      return cached;
    }
    return { runs: [] };
  } catch (err) {
    console.error('[scanner] Error loading scanner log from cache:', err.message);
    return { runs: [] };
  }
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
  } else if (rootsArray.length === 0) {
    // Empty array — don't delete all roots without confirmation
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
    `INSERT INTO scanner_runs (id, status, started_at, completed_at, root_ids, roots_requested, roots_scanned, total_created, total_updated, total_deleted, total_unchanged, total_duplicate_drafts, skipped, errors, root_results, error, trigger_source, created_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17, $18) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, completed_at = EXCLUDED.completed_at, roots_scanned = EXCLUDED.roots_scanned, total_created = EXCLUDED.total_created, total_updated = EXCLUDED.total_updated, total_deleted = EXCLUDED.total_deleted, total_unchanged = EXCLUDED.total_unchanged, total_duplicate_drafts = EXCLUDED.total_duplicate_drafts, skipped = EXCLUDED.skipped, errors = EXCLUDED.errors, root_results = EXCLUDED.root_results, error = EXCLUDED.error, trigger_source = EXCLUDED.trigger_source`,
    [String(entry.id || ''), String(entry.status || 'completed'), entry.startedAt || null, entry.completedAt || null, JSON.stringify(entry.rootIds || []), toSafeInteger(entry.rootsRequested), toSafeInteger(entry.rootsScanned), toSafeInteger(entry.created), toSafeInteger(entry.updated), toSafeInteger(entry.deleted), toSafeInteger(entry.unchanged), toSafeInteger(entry.duplicateDrafts), JSON.stringify(entry.skipped || []), JSON.stringify(entry.errors || []), JSON.stringify(entry.rootResults || []), entry.error || null, String(entry.triggerSource || 'manual'), entry.startedAt || new Date().toISOString()]
  );
  
  try {
    const current = appStateCache.get('scanner_log') || { runs: [] };
    const cacheEntry = {
      ...entry,
      totalErrors: Array.isArray(entry.errors) ? entry.errors.length : 0,
      rootResults: Array.isArray(entry.rootResults)
        ? entry.rootResults.map((r) => ({ ...r, totalErrors: Array.isArray(r.errors) ? r.errors.length : 0 }))
        : entry.rootResults || [],
    };
    const runs = [cacheEntry, ...(current.runs || []).filter((r) => r.id !== entry.id)].slice(0, MAX_SCANNER_RUNS);
    appStateCache.set('scanner_log', { runs });
  } catch (err) {
    console.error('[scanner] Error updating scanner log cache:', err.message);
    // Fallback: reload from database to ensure cache is in sync
    await refreshScannerCaches();
  }
  return entry;
}

async function getScannerRuns(limit = 10) {
  try {
    const log = loadScannerLog();
    const runs = Array.isArray(log.runs) ? log.runs : [];
    return runs.slice(0, limit);
  } catch (err) {
    console.error('[scanner] Error getting scanner runs:', err.message);
    // Fallback: load from database
    await ensureContentStore();
    const result = await db.query('SELECT * FROM scanner_runs ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows.map(rowToScannerRun);
  }
}

async function getScannerRunById(id) {
  await ensureContentStore();
  const runId = String(id || '').trim();
  if (!runId) return null;
  const result = await db.query('SELECT * FROM scanner_runs WHERE id = $1 LIMIT 1', [runId]);
  const row = result.rows[0];
  return row ? rowToScannerRun(row) : null;
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

async function getRootIdsWithContent(rootIds = []) {
  await ensureContentStore();
  const ids = (rootIds || []).map((id) => String(id || '').trim()).filter(Boolean);
  if (!ids.length) return new Set();
  const result = await db.query(
    `SELECT DISTINCT source_root_id FROM content_catalog WHERE source_type = $1 AND source_root_id = ANY($2::text[])`,
    ['scanner', ids],
  );
  return new Set(result.rows.map((row) => row.source_root_id));
}


async function deleteItemsByScanSignatures(scanSignatures = []) {
  const signatures = new Set((scanSignatures || []).filter(Boolean));
  if (!signatures.size) return 0;
  await ensureContentStore();
  const result = await db.query("DELETE FROM content_catalog WHERE payload->>'scanSignature' = ANY($1::text[])", [[...signatures]]);
  return result.rowCount || 0;
}

async function computeDuplicateMetadataInMemory(item) {
  if (!item || !item.titleKey) {
    return { ...item, duplicateCandidates: [], duplicateCount: 0 };
  }
  const groupKey = `${item.type}:${item.titleKey}`;
  const result = await db.query(
    'SELECT payload FROM content_catalog WHERE content_type = $1 AND title_key = $2',
    [item.type, item.titleKey],
  );
  const candidates = result.rows.map((row) => normalizeItem(row.payload));
  return attachDuplicateMetadata(item, new Map([[groupKey, candidates]]));
}

async function syncDuplicateCountColumn(itemId, duplicateCount) {
  if (!itemId || !Number.isFinite(duplicateCount)) return;
  if (duplicateCount === 0) {
    await db.query('UPDATE content_catalog SET duplicate_count = 0 WHERE id = $1 AND duplicate_count <> 0', [itemId]);
    return;
  }
  await db.query('UPDATE content_catalog SET duplicate_count = $2 WHERE id = $1', [itemId, duplicateCount]);
}

// The titleKey/fuzzy fallback below exists to catch legitimate relocations (root
// renamed, file moved) where the old sourcePath is gone. If the existing item's
// sourcePath is set, differs from the incoming candidate, and still exists on disk,
// this is two live folders sharing a title (a real duplicate), not a relocation —
// matching them would make the scanner ping-pong one DB row between both folders
// every scan. Skip the fallback match in that case so a separate item is created.
//
// HOWEVER: if the files live in DIFFERENT scanner roots, they are likely the same
// movie in different directories (e.g. Requested/Movies vs Other_Foreign_Movies,
// or Hindi_Dubbed_Movies vs English_Movies). In that case, treat them as the same
// item to prevent duplicate creation across roots.
function isLiveDistinctSourcePath(existingPayload, incomingPayload) {
  const existingPath = existingPayload?.sourcePath;
  const incomingPath = incomingPayload?.sourcePath;
  if (!existingPath || !incomingPath || existingPath === incomingPath) {
    return false;
  }
  try {
    if (!fs.existsSync(existingPath)) return false;
    // If both files exist and have the same size, they are likely the same
    // file that was renamed between scans (e.g., release tag removed).
    // Treat them as the same item to prevent duplicate creation.
    const existingSize = existingPayload?.fileSize || 0;
    const incomingSize = incomingPayload?.fileSize || 0;
    if (existingSize > 4096 && incomingSize > 4096 && existingSize === incomingSize) {
      return false;
    }
    // Cross-root duplicates: if files are in different scanner roots but share
    // the same title, treat them as duplicates (e.g. Requested vs Other_Foreign).
    const existingRoot = existingPayload?.sourceRootId || '';
    const incomingRoot = incomingPayload?.sourceRootId || '';
    if (existingRoot && incomingRoot && existingRoot !== incomingRoot) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// A second, noisily-named copy of an already-published movie (e.g. a backup/archive
// folder with release-group tags in its name) often can't be cleaned enough for the
// title_key/fuzzy checks above to recognize it — that noise is exactly why TMDb itself
// returned metadataStatus 'not_found'. Left alone, every scan re-discovers the folder,
// fails to match it again, and creates a fresh unmatched draft with a new id (deleting
// those drafts doesn't help — the file is still there, so the next scan just recreates
// one). Catch this narrow case: if the published title is a whole-word prefix of the
// candidate's cleaned title and the published item's own file still exists elsewhere,
// treat the candidate as a known duplicate instead of manufacturing draft noise.
async function findDuplicateOfPublishedByPrefix(payload) {
  const normalize = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const probe = normalize(payload.parsedTitle || payload.title);
  if (!probe) return null;
  // Drop a leading standalone number (a collection/disc index like "3. Venom - ...")
  // so the real title, not the index, lines up with the published prefix check below.
  const probeWords = probe.replace(/^\d+\s+/, '').split(' ');
  if (!probeWords.length) return null;

  // Order by title length (ascending) and cap generously: a common leading word
  // ("The", "A") can match hundreds of published titles, and without ordering,
  // an unordered LIMIT can cut off the very short exact-prefix title we want.
  const candidates = await db.query(
    `SELECT payload FROM content_catalog
     WHERE content_type = $1 AND status = 'published' AND title ILIKE $2
     ORDER BY length(title) ASC
     LIMIT 500`,
    [String(payload.type || '').toLowerCase(), `${probeWords[0]}%`],
  );

  for (const row of candidates.rows) {
    // Some older published titles still carry their own leftover tags, e.g.
    // "Venom: The Last Dance (2024)  {Dual Audio}" — truncate at the first
    // bracket/paren/brace so that noise doesn't break the prefix comparison.
    const existingTitleCore = String(row.payload?.title || '').split(/[([{]/)[0];
    const existingTitle = normalize(existingTitleCore);
    const existingWords = existingTitle.split(' ').filter(Boolean);
    if (!existingWords.length || existingWords.length >= probeWords.length) continue;
    if (probeWords.slice(0, existingWords.length).join(' ') !== existingTitle) continue;

    const existingYear = row.payload?.year || null;
    if (payload.year && existingYear && payload.year !== existingYear) continue;

    if (isLiveDistinctSourcePath(row.payload, payload)) {
      return row.payload;
    }
  }
  return null;
}

async function upsertScannedItem(payload) {
  const now = new Date().toISOString();
  if (!payload || !['movie', 'series'].includes(String(payload.type || '').toLowerCase())) {
    throw new Error(`Unsupported scanner content type: ${payload?.type || 'unknown'}`);
  }
  await ensureContentStore();
  let existing = await db.query("SELECT id, payload FROM content_catalog WHERE payload->>'scanSignature' = $1 LIMIT 1", [payload.scanSignature]);
  let current = existing.rows[0]?.payload || null;

  // ── NEW ITEM (or root rename detected) ───────────────────────────────────
  if (!current) {
    // If scanSignature didn't match, try matching by sourcePath.
    // This handles scanner root renames where the root ID changed but
    // file paths remain the same, preventing duplicate item creation.
    if (payload.sourcePath) {
      const pathMatch = await db.query(
        "SELECT id, payload FROM content_catalog WHERE payload->>'sourcePath' = $1 AND source_type = 'scanner' LIMIT 1",
        [payload.sourcePath]
      );
      current = pathMatch.rows[0]?.payload || null;
    }

    if (current) {
      // Root was renamed — update the existing item's root metadata
      // and fall through to the existing-item update path below.
      payload = {
        ...payload,
        title: payload.title || current.title,
        seasons: payload.seasons || current.seasons || [],
        seasonCount: payload.seasonCount ?? current.seasonCount ?? 0,
        episodeCount: payload.episodeCount ?? current.episodeCount ?? 0,
      };
    }
  }

  // ── TITLE KEY FALLBACK (prevents duplicate creation) ────────────────────
  // When scan paths change (root path rename, file move, etc.), both
  // scanSignature and sourcePath won't match, so a new item would be created.
  // Check by titleKey instead — if an existing scanner item with the same
  // type:titleKey is found, update it rather than creating a duplicate.
  // Also try fuzzy matching for similar titles (e.g., "K.G.F" vs "KGF").
  if (!current) {
    const computedTitleKey = normalizeTitleKey(payload.title, payload.year);
    if (computedTitleKey) {
      // Try exact titleKey match first
      const titleKeyMatch = await db.query(
        `SELECT id, payload FROM content_catalog
         WHERE content_type = $1 AND title_key = $2
           AND source_type = 'scanner'
         LIMIT 1`,
        [String(payload.type || '').toLowerCase(), computedTitleKey],
      );
      if (titleKeyMatch.rows[0] && isLiveDistinctSourcePath(titleKeyMatch.rows[0].payload, payload)) {
        // Two live folders share this title (a real duplicate on disk, not a
        // relocation). Leave the already-catalogued folder alone instead of
        // spawning a second visible card or overwriting it back and forth.
        return { item: normalizeItem(titleKeyMatch.rows[0].payload), created: false, updated: false };
      }
      if (titleKeyMatch.rows[0]) {
        current = titleKeyMatch.rows[0].payload;
        payload = {
          ...payload,
          title: payload.title || current.title,
          seasons: payload.seasons || current.seasons || [],
          seasonCount: payload.seasonCount ?? current.seasonCount ?? 0,
          episodeCount: payload.episodeCount ?? current.episodeCount ?? 0,
        };
      } else {
        // No exact match - try fuzzy matching with existing scanner items
        const existingItems = await db.query(
          `SELECT id, title, title_key, payload FROM content_catalog
           WHERE content_type = $1
             AND source_type = 'scanner'
             AND title_key IS NOT NULL
             AND title_key <> ''
           LIMIT 100`,
          [String(payload.type || '').toLowerCase()],
        );

        for (const row of existingItems.rows) {
          const existingTitle = row.payload?.title || row.title || '';
          const existingYear = row.payload?.year || null;
          const existingTitleKey = row.title_key || normalizeTitleKey(existingTitle, existingYear);

          // Check if titles match fuzzily
          if (titlesFuzzyMatch(payload.title, existingTitle, 0.8)) {
            // Also check year match if both have years
            const yearMatch = !payload.year || !existingYear || payload.year === existingYear;
            if (yearMatch) {
              if (isLiveDistinctSourcePath(row.payload, payload)) {
                return { item: normalizeItem(row.payload), created: false, updated: false };
              }
              current = row.payload;
              payload = {
                ...payload,
                title: payload.title || current.title,
                seasons: payload.seasons || current.seasons || [],
                seasonCount: payload.seasonCount ?? current.seasonCount ?? 0,
                episodeCount: payload.episodeCount ?? current.episodeCount ?? 0,
              };
              break;
            }
          }
        }
      }
    }
  }

  // A candidate TMDb couldn't identify might still be a known movie under a messier
  // filename — check whether it's actually a duplicate of something already published
  // before manufacturing a permanent-looking "not_found" draft for it.
  if (!current && payload.metadataStatus === 'not_found') {
    const duplicateOfPublished = await findDuplicateOfPublishedByPrefix(payload);
    if (duplicateOfPublished) {
      return { item: normalizeItem(duplicateOfPublished), created: false, updated: false };
    }
  }

  // ── FILE SIZE DEDUP (prevents duplicates from renamed files) ────────────
  // When a file is renamed between scans (e.g., release tags removed), the
  // scanSignature changes and titleKey may also change (if metadata enrichment
  // gave a wrong title). Fall back to matching by fileSize + source_root_id:
  // same file size in the same root = same file, just renamed.
  // Also check across roots when title matches (cross-root duplicates).
  // Note: Only apply to movies with actual file sizes (> 4096 bytes) to prevent
  // directory fileSize collisions in series roots.
  if (!current && payload.type === 'movie' && payload.fileSize && payload.fileSize > 4096 && payload.sourceRootId) {
    const sizeMatch = await db.query(
      `SELECT id, payload FROM content_catalog
       WHERE content_type = $1 AND source_type = 'scanner'
         AND source_root_id = $2
         AND payload->>'fileSize' = $3
       LIMIT 1`,
      [String(payload.type || '').toLowerCase(), payload.sourceRootId, String(payload.fileSize)],
    );
    if (sizeMatch.rows[0]) {
      current = sizeMatch.rows[0].payload;
      payload = {
        ...payload,
        title: payload.title || current.title,
        seasons: payload.seasons || current.seasons || [],
        seasonCount: payload.seasonCount ?? current.seasonCount ?? 0,
        episodeCount: payload.episodeCount ?? current.episodeCount ?? 0,
      };
    }
  }

  // Cross-root fileSize dedup: if no same-root match found, check other roots
  // but only if the title also matches (to avoid false positives from coincidental size matches).
  if (!current && payload.type === 'movie' && payload.fileSize && payload.fileSize > 4096 && payload.sourceRootId && payload.title) {
    const crossRootMatch = await db.query(
      `SELECT id, payload FROM content_catalog
       WHERE content_type = $1 AND source_type = 'scanner'
         AND source_root_id != $2
         AND payload->>'fileSize' = $3
         AND title ILIKE $4
       LIMIT 1`,
      [String(payload.type || '').toLowerCase(), payload.sourceRootId, String(payload.fileSize), payload.title],
    );
    if (crossRootMatch.rows[0]) {
      current = crossRootMatch.rows[0].payload;
      payload = {
        ...payload,
        title: payload.title || current.title,
        seasons: payload.seasons || current.seasons || [],
        seasonCount: payload.seasonCount ?? current.seasonCount ?? 0,
        episodeCount: payload.episodeCount ?? current.episodeCount ?? 0,
      };
    }
  }

  // ── NEW ITEM (truly new) ────────────────────────────────────────────────
  if (!current) {
    // By default, scanner publishes 100% of discovered media items directly to the portal.
    // Metadata enricher will try to attach TMDB/OMDB info, but missing metadata does not prevent publishing.
    const nextStatus = payload.status || process.env.SCANNER_DEFAULT_STATUS || 'published';
    const nextPublishedAt = nextStatus === 'published' ? (payload.publishedAt || now) : '';

    const baseItem = normalizeItem({
      id: await require('./content').allocateNextCatalogId(),
      createdAt: now,
      updatedAt: now,
      sourceType: 'scanner',
      ...payload,
      titleKey: normalizeTitleKey(payload.title, payload.year),
      status: nextStatus,
      publishedAt: nextPublishedAt,
      lastScanRunId: payload.lastScanRunId || '',
      lastScanRunAt: payload.lastScanRunAt || now,
    });

    // Compute duplicate metadata in-memory (1 query) before writing to DB,
    // so the column is correct on first insert and we avoid a second round-trip.
    const itemWithDuplicates = await computeDuplicateMetadataInMemory(baseItem);

    const insertCols = extractTypedColumns(itemWithDuplicates);
    // Use ON CONFLICT DO NOTHING to guard against race conditions where two concurrent
    // scan threads both see "not found" and both attempt INSERT for the same scanSignature.
    // If INSERT is skipped (0 rows), we fall through to the update path below.
    const insertResult = await db.query(
      `INSERT INTO content_catalog
        (id, payload, created_at, updated_at, status, content_type, title, title_key,
         language, category, collection, source_type, source_root_id, last_scan_run_id,
         year, rating, featured, featured_order, trending_score, duplicate_count,
         metadata_status, published_at, released_at)
       VALUES ($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT DO NOTHING`,
      [itemWithDuplicates.id, JSON.stringify(itemWithDuplicates), now, now,
       insertCols.status, insertCols.content_type, insertCols.title, insertCols.title_key,
       insertCols.language, insertCols.category, insertCols.collection,
       insertCols.source_type, insertCols.source_root_id, insertCols.last_scan_run_id,
       insertCols.year, insertCols.rating, insertCols.featured, insertCols.featured_order,
       insertCols.trending_score, insertCols.duplicate_count, insertCols.metadata_status,
       insertCols.published_at, insertCols.released_at],
    );

    // If INSERT was skipped due to conflict (race condition), re-fetch the winner and update it.
    if (!insertResult.rowCount) {
      const raceWinner = await db.query(
        "SELECT id, payload FROM content_catalog WHERE payload->>'scanSignature' = $1 LIMIT 1",
        [payload.scanSignature],
      );
      current = raceWinner.rows[0]?.payload || null;
      if (!current) {
        // Should not happen, but guard anyway
        return { item: itemWithDuplicates, created: false, updated: false };
      }
      // Fall through to the existing-item update path (current is now set)
    } else {
      // Defensive sync: only updates if the column value drifted from in-memory state.
      await syncDuplicateCountColumn(itemWithDuplicates.id, itemWithDuplicates.duplicateCount);
      return { item: itemWithDuplicates, created: true, updated: false };
    }
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

  // For metadata: only update if scan found a better match or current is pending.
  // ALSO force a full metadata refresh when the scanSignature changed — this means
  // the file was renamed on disk, so we must re-fetch TMDB data (title, poster, etc.)
  // from the new filename rather than keeping stale data from the old name.
  const fileWasRenamed = payload.scanSignature && current.scanSignature
    && payload.scanSignature !== current.scanSignature;
  const shouldUpdateMetadata = !isUserManaged
    || current.metadataStatus === 'pending'
    || current.metadataStatus === 'not_found'
    || current.metadataStatus === 'skipped'
    || fileWasRenamed;
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
    title:            (!shouldUpdateMetadata && (current.title || '')) || payload.title || current.title,
    titleKey:         normalizeTitleKey(payload.title || current.title, payload.year || current.year),
    slug:             (!shouldUpdateMetadata && (current.slug || '')) || payload.slug || current.slug || '',
    poster:           (!shouldUpdateMetadata && (current.poster || '')) || payload.poster || current.poster || '',
    backdrop:         (!shouldUpdateMetadata && (current.backdrop || '')) || payload.backdrop || current.backdrop || '',
    videoUrl:         payload.videoUrl         || current.videoUrl || '',
    sourcePath:       payload.sourcePath       || current.sourcePath || '',
    sourcePublicPath: payload.sourcePublicPath || current.sourcePublicPath || '',
    seasons:          payload.seasons          || current.seasons || [],
    seasonCount:      payload.seasonCount      ?? current.seasonCount ?? 0,
    episodeCount:     payload.episodeCount     ?? current.episodeCount ?? 0,
    scanSignature:    payload.scanSignature    || current.scanSignature || '',
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

  // Compare episode-level paths across seasons to detect file moves/renames
  function seasonEpisodePathsChanged(newSeasons, oldSeasons) {
    if (!Array.isArray(newSeasons) || !Array.isArray(oldSeasons)) return true;
    if (newSeasons.length !== oldSeasons.length) return true;
    for (let s = 0; s < newSeasons.length; s++) {
      const newEps = newSeasons[s]?.episodes || [];
      const oldEps = oldSeasons[s]?.episodes || [];
      if (newEps.length !== oldEps.length) return true;
      for (let e = 0; e < newEps.length; e++) {
        if ((newEps[e]?.sourcePath || '') !== (oldEps[e]?.sourcePath || '')) return true;
        if ((newEps[e]?.videoUrl || '')   !== (oldEps[e]?.videoUrl || ''))   return true;
      }
    }
    return false;
  }

  // Skip DB write entirely if nothing meaningful changed
  const scanFieldsChanged = item.title        !== current.title
    || item.poster       !== (current.poster || '')
    || item.videoUrl     !== (current.videoUrl || '')
    || item.sourcePath   !== (current.sourcePath || '')
    || item.scanSignature !== (current.scanSignature || '')
    || item.sourceRootId  !== (current.sourceRootId || '')
    || item.seasonCount  !== (current.seasonCount ?? 0)
    || item.episodeCount !== (current.episodeCount ?? 0)
    || item.status       !== current.status
    || (shouldUpdateMetadata && item.metadataStatus !== current.metadataStatus)
    || seasonEpisodePathsChanged(item.seasons, current.seasons);

  if (!scanFieldsChanged) {
    return { item: normalizeItem(current), created: false, updated: false };
  }

  // Compute duplicate metadata in-memory (1 query) so the column is correct
  // on first update and we avoid re-fetching the row + a second round-trip.
  const itemWithDuplicates = await computeDuplicateMetadataInMemory(item);

  const updateCols = extractTypedColumns(itemWithDuplicates);
  await db.query(
    `UPDATE content_catalog
     SET payload = $2::jsonb, updated_at = NOW(), status = $3, content_type = $4,
         title = $5, title_key = $6, language = $7, category = $8, collection = $9,
         source_type = $10, source_root_id = $11, last_scan_run_id = $12,
         year = $13, rating = $14, featured = $15, featured_order = $16,
         trending_score = $17, duplicate_count = $18, metadata_status = $19,
         published_at = $20, released_at = $21
     WHERE id = $1`,
    [itemWithDuplicates.id, JSON.stringify(itemWithDuplicates),
     updateCols.status, updateCols.content_type, updateCols.title, updateCols.title_key,
     updateCols.language, updateCols.category, updateCols.collection,
     updateCols.source_type, updateCols.source_root_id, updateCols.last_scan_run_id,
     updateCols.year, updateCols.rating, updateCols.featured, updateCols.featured_order,
     updateCols.trending_score, updateCols.duplicate_count, updateCols.metadata_status,
     updateCols.published_at, updateCols.released_at],
  );

  // Defensive sync: only updates if the column value drifted from in-memory state.
  await syncDuplicateCountColumn(itemWithDuplicates.id, itemWithDuplicates.duplicateCount);
  return { item: itemWithDuplicates, created: false, updated: true };
}

async function deleteScannerItemsNotInSignatures(sourceRootId, scanSignatures = []) {
  const rootId = String(sourceRootId || '').trim();
  if (!rootId) return 0;
  const signatures = [...new Set((scanSignatures || []).filter(Boolean))];

  // SAFE DELETE: only remove items that are NOT user-managed.
  // published and archived items are NEVER auto-deleted — admin must remove manually.
  // draft items ARE auto-deleted when orphaned (stale scanSignature + sourcePath) because
  // the titleKey fallback (June 2026) prevents re-creation of legitimate drafts.
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
    // No signatures at all — guard: only delete items with empty/missing signatures
    // Prevents accidental deletion of all non-protected items
    result = await db.query(
      `DELETE FROM content_catalog
       WHERE source_type = $1
         AND source_root_id = $2
         AND status <> ALL($3::text[])
         AND (COALESCE(payload->>'scanSignature', '') = '' OR payload->>'scanSignature' IS NULL)`,
      ['scanner', rootId, PROTECTED_STATUSES],
    );
  }
  const count = Number(result?.rowCount ?? 0);

  // Clean up stale published entries: published items whose sourcePath doesn't exist
  // on disk AND whose scanSignature is not in the current set AND a newer entry with
  // the same titleKey exists. This prevents orphaned published entries from persisting
  // forever when files are relocated.
  let stalePublishedDeleted = 0;
  if (signatures.length) {
    const stalePublished = await db.query(
      `SELECT id, payload FROM content_catalog
       WHERE source_type = $1
         AND source_root_id = $2
         AND status = 'published'
         AND COALESCE(payload->>'scanSignature', '') <> ALL($3::text[])`,
      ['scanner', rootId, signatures],
    );

    for (const row of stalePublished.rows) {
      const p = row.payload;
      if (!p || !p.sourcePath) continue;

      // Check if sourcePath exists on disk
      const fs = require('fs');
      const pathExists = await fs.promises.access(p.sourcePath).then(() => true).catch(() => false);
      if (pathExists) continue;

      // ── CROSS-ROOT MOVE GUARD ──────────────────────────────────────────────
      // Before deleting, check if another root has already claimed this item.
      // This handles the race condition where Root A scans first (sees file gone),
      // would delete the record, but Root B hasn't scanned yet and will find the
      // file in its new location. If we delete here, Root B creates a new ID,
      // breaking any direct links to the old catalog ID.
      //
      // We check two signals:
      //   1. Same titleKey with a different sourceRootId and a live sourcePath
      //   2. Same fileSize in a different root with a live sourcePath
      const titleKey = p.titleKey || normalizeTitleKey(p.title, p.year);
      let claimedByOtherRoot = false;

      if (titleKey) {
        const titleClaim = await db.query(
          `SELECT id, payload FROM content_catalog
           WHERE title_key = $1
             AND source_type = 'scanner'
             AND source_root_id <> $2
             AND id <> $3
           LIMIT 1`,
          [titleKey, rootId, row.id],
        );
        if (titleClaim.rows[0]) {
          const claimedPath = titleClaim.rows[0].payload?.sourcePath;
          if (claimedPath) {
            const claimedExists = await fs.promises.access(claimedPath).then(() => true).catch(() => false);
            if (claimedExists) claimedByOtherRoot = true;
          }
        }
      }

      // Also check by fileSize as a secondary signal
      if (!claimedByOtherRoot && p.fileSize && Number(p.fileSize) > 4096) {
        const sizeClaim = await db.query(
          `SELECT id, payload FROM content_catalog
           WHERE source_type = 'scanner'
             AND source_root_id <> $1
             AND id <> $2
             AND payload->>'fileSize' = $3
           LIMIT 1`,
          [rootId, row.id, String(p.fileSize)],
        );
        if (sizeClaim.rows[0]) {
          const claimedPath = sizeClaim.rows[0].payload?.sourcePath;
          if (claimedPath) {
            const claimedExists = await fs.promises.access(claimedPath).then(() => true).catch(() => false);
            if (claimedExists) claimedByOtherRoot = true;
          }
        }
      }

      // ── DISK-LEVEL FALLBACK ────────────────────────────────────────────────
      // Root B may not have scanned yet, so no DB claim exists.
      // As a final guard, check if the file's basename exists somewhere else
      // under the media root on disk. If it does, hold off on deletion —
      // Root B's scan will claim this record when it runs.
      if (!claimedByOtherRoot) {
        const basename = require('path').basename(p.sourcePath);
        const mediaRoot = process.env.SCANNER_MEDIA_ROOT || '/var/www/html';
        try {
          const { execSync } = require('child_process');
          // Use find with maxdepth 5 to avoid hanging on massive trees
          const found = execSync(
            `find "${mediaRoot}" -maxdepth 5 -name "${basename.replace(/"/g, '')}" -not -path "${p.sourcePath}" 2>/dev/null | head -1`,
            { timeout: 5000, encoding: 'utf8' }
          ).trim();
          if (found) claimedByOtherRoot = true;
        } catch { /* find failed or timed out — proceed with deletion */ }
      }

      // If another root already has this file, skip deletion — the upsert
      // path will naturally re-assign this record when that root is scanned.
      if (claimedByOtherRoot) continue;

      // If sourcePath no longer exists on disk AND no other root has claimed it,
      // delete the stale record to prevent ghost/duplicate DB rows.
      await db.query('DELETE FROM content_catalog WHERE id = $1', [row.id]);
      stalePublishedDeleted += 1;
    }
  }

  return count + stalePublishedDeleted;
}

async function refreshCatalogReferencesForNormalizedFile(payload = {}) {
  const previousSourcePath = String(payload.previousSourcePath || '').trim();
  const nextSourcePath = String(payload.nextSourcePath || '').trim();
  const previousVideoUrl = String(payload.previousVideoUrl || '').trim();
  const nextVideoUrl = String(payload.nextVideoUrl || '').trim();
  if (!previousSourcePath || !nextSourcePath) return { updatedItems: 0, updatedEpisodes: 0 };
  const items = await require('./content').getItems();
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
  getScannerRunById,
  getItemByScanSignature,
  getScanSignaturesByRootId,
  getRootIdsWithContent,
  deleteItemsByScanSignatures,
  upsertScannedItem,
  deleteScannerItemsNotInSignatures,
  refreshCatalogReferencesForNormalizedFile,
};
