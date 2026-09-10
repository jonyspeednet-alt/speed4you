const { listItems, getItemById } = require('../data/store');
const { resolveTargets, analyzeTarget } = require('./media-compat');
const mediaStore = require('./media-store');
const logger = require('../utils/logger');

const BAD_VERDICTS = new Set(['audio_issue', 'video_issue', 'both']);
const PAGE_SIZE = 100;
const MAX_SCAN_TARGETS = 5000;

const scan = {
  status: 'idle', // idle | running | done | cancelled | failed
  startedAt: null,
  finishedAt: null,
  typeFilter: 'all',
  total: 0,
  checked: 0,
  found: [],
  errors: [],
  error: null,
};

function publicScan() {
  return {
    status: scan.status,
    startedAt: scan.startedAt,
    finishedAt: scan.finishedAt,
    typeFilter: scan.typeFilter,
    total: scan.total,
    checked: scan.checked,
    foundCount: scan.found.length,
    found: scan.found.slice(0, 500),
    truncated: scan.found.length > 500,
    errors: scan.errors.slice(0, 20),
    error: scan.error,
  };
}

async function startLibraryScan({ type } = {}) {
  if (scan.status === 'running') {
    const err = new Error('A library scan is already running');
    err.code = 'BUSY';
    throw err;
  }
  const typeFilter = type === 'movie' || type === 'series' ? type : 'all';
  Object.assign(scan, {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    typeFilter,
    total: 0,
    checked: 0,
    found: [],
    errors: [],
    error: null,
    cancelRequested: false,
  });

  runScanLoop(typeFilter).catch((error) => {
    scan.status = 'failed';
    scan.error = error.message;
    scan.finishedAt = new Date().toISOString();
    try { logger.warn('Media library scan failed', { error: error.message }); } catch { /* ignore */ }
  });

  return publicScan();
}

function cancelLibraryScan() {
  if (scan.status === 'running') {
    scan.cancelRequested = true;
  }
  return publicScan();
}

async function runScanLoop(typeFilter) {
  const filters = { status: 'published' };
  if (typeFilter === 'movie' || typeFilter === 'series') filters.type = typeFilter;

  const first = await listItems(filters, 0, 1, 'latest');
  scan.total = Number(first.total || 0);

  let offset = 0;
  let targetCount = 0;
  while (offset < scan.total) {
    if (scan.cancelRequested) {
      scan.status = 'cancelled';
      scan.finishedAt = new Date().toISOString();
      await mediaStore.saveLastScanReport({ ...publicScan(), savedAt: new Date().toISOString() }).catch(() => {});
      return;
    }
    const { items } = await listItems(filters, offset, PAGE_SIZE, 'latest');
    if (!items || items.length === 0) break;

    for (const item of items) {
      if (scan.cancelRequested) break;
      scan.checked += 1;
      let targets = [];
      try {
        targets = resolveTargets(item, item.type === 'series' ? { allEpisodes: true } : {});
      } catch {
        continue; // no seasons etc. — skip silently
      }
      for (const target of targets) {
        if (targetCount >= MAX_SCAN_TARGETS) break;
        targetCount += 1;
        try {
          const analysis = await analyzeTarget(target);
          if (BAD_VERDICTS.has(analysis.verdict)) {
            scan.found.push({
              itemId: item.id,
              title: item.title,
              type: item.type,
              targetKey: target.key,
              label: target.label,
              verdict: analysis.verdict,
              filePath: analysis.filePath,
              sizeBytes: analysis.sizeBytes,
              season: target.seasonNumber ?? null,
              episode: target.episodeNumber ?? null,
              video: analysis.video ? `${analysis.video.codec.toUpperCase()}${analysis.video.width ? ` ${analysis.video.width}x${analysis.video.height}` : ''}` : '—',
              audio: (analysis.audios || []).map((a) => `${a.codec.toUpperCase()}${a.language ? `(${a.language})` : ''}`).join(', ') || '—',
            });
          }
        } catch (error) {
          if (scan.errors.length < 50) {
            scan.errors.push({ itemId: item.id, label: target.label, error: String(error.message || error).slice(0, 200) });
          }
        }
      }
      if (targetCount >= MAX_SCAN_TARGETS) break;
    }
    offset += items.length;
  }

  scan.status = 'done';
  scan.finishedAt = new Date().toISOString();
  await mediaStore.saveLastScanReport({ ...publicScan(), savedAt: new Date().toISOString() }).catch(() => {});
  try {
    logger.info('Media library scan completed', {
      total: scan.total, checked: scan.checked, found: scan.found.length,
    });
  } catch { /* ignore */ }
}

async function getScanState() {
  if (scan.status === 'idle') {
    const last = await mediaStore.getLastScanReport().catch(() => null);
    return { ...publicScan(), lastReport: last };
  }
  return publicScan();
}

module.exports = {
  startLibraryScan,
  cancelLibraryScan,
  getScanState,
  BAD_VERDICTS: [...BAD_VERDICTS],
};
