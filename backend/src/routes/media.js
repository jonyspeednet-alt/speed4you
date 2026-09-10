const express = require('express');
const { getItemById } = require('../data/store');
const {
  PRESETS,
  analyzeContent,
  analyzeTarget,
  parseContentInput,
  resolveTargets,
  normalizeTranscodeOptions,
} = require('../services/media-compat');
const transcodeJobs = require('../services/transcode-jobs');
const mediaStore = require('../services/media-store');
const libraryScan = require('../services/media-library-scan');

const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function toPositiveInt(value, fallback) {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return Math.floor(asNumber);
  return fallback;
}

function pickOptions(body = {}, query = {}) {
  const src = { ...query, ...body };
  return {
    season: src.season !== undefined ? toPositiveInt(src.season, 1) : undefined,
    episode: src.episode !== undefined ? toPositiveInt(src.episode, 1) : undefined,
    allEpisodes: src.allEpisodes === true || src.allEpisodes === 'true' || src.allEpisodes === '1',
  };
}

function sendKnownError(res, error) {
  const code = error?.code;
  if (code === 'BAD_INPUT') return res.status(400).json({ error: error.message });
  if (code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
  if (code === 'NO_MEDIA') return res.status(404).json({ error: error.message });
  if (code === 'TOO_MANY') return res.status(400).json({ error: error.message });
  if (code === 'BAD_TYPE') return res.status(400).json({ error: error.message });
  if (code === 'NO_SPACE') return res.status(400).json({ error: error.message });
  if (code === 'PROBE_FAILED') return res.status(502).json({ error: error.message });
  throw error;
}

// POST /api/admin/media/analyze — probe file(s) + browser-compatibility verdict
router.post('/analyze', asyncRoute(async (req, res) => {
  try {
    const { input } = req.body || {};
    const options = pickOptions(req.body, req.query);
    const result = await analyzeContent(input, options);
    res.json({ ...result, presets: Object.values(PRESETS) });
  } catch (error) {
    sendKnownError(res, error);
  }
}));

// POST /api/admin/media/transcode — queue transcode job(s) for analyzed targets
router.post('/transcode', asyncRoute(async (req, res) => {
  try {
    const { input, preset, options } = req.body || {};
    const presetId = PRESETS[preset] ? preset : 'browser';
    const trxOptions = normalizeTranscodeOptions(options || {});
    const scanOptions = pickOptions(req.body, req.query);

    const key = parseContentInput(input);
    const item = await getItemById(key).catch(() => null);
    if (!item) {
      return res.status(404).json({ error: 'Content not found for that link/ID' });
    }
    const targets = resolveTargets(item, scanOptions);
    if (targets.length > 60) {
      return res.status(400).json({ error: `Too many files (${targets.length}). Pick a single season/episode.` });
    }
    if (targets.length === 0) {
      return res.status(404).json({ error: 'No playable files found for this content' });
    }

    const created = [];
    const busyPaths = transcodeJobs.getActiveSourcePaths();
    for (const target of targets) {
      const analysis = await analyzeTarget(target);
      if (!analysis.exists) {
        if (analysis.verdict === 'ambiguous') {
          created.push({ target: target.label, skipped: true, reason: (analysis.issues[0] || {}).message || 'Ambiguous file mapping' });
        } else {
          created.push({ target: target.label, skipped: true, reason: 'Source file not found on server' });
        }
        continue;
      }
      if (busyPaths.has(analysis.filePath)) {
        created.push({ target: target.label, skipped: true, reason: 'This file already has a queued/running transcode job' });
        continue;
      }
      if (analysis.verdict === 'compatible' && presetId === 'browser') {
        created.push({ target: target.label, skipped: true, reason: 'Already browser-compatible — nothing to convert' });
        continue;
      }
      let job;
      try {
        job = transcodeJobs.createJob({ item, target, analysis, presetId, options: trxOptions });
      } catch (error) {
        created.push({ target: target.label, skipped: true, reason: error.message });
        continue;
      }
      busyPaths.add(analysis.filePath);
      created.push({ target: target.label, jobId: job.id, status: job.status });
    }

    const jobs = [];
    for (const c of created.filter((c) => c.jobId)) {
      jobs.push(await transcodeJobs.getJob(c.jobId));
    }
    res.status(201).json({ preset: presetId, options: trxOptions, results: created, jobs });
  } catch (error) {
    sendKnownError(res, error);
  }
}));

// GET /api/admin/media/presets
router.get('/presets', (req, res) => {
  res.json(Object.values(PRESETS));
});

// GET /api/admin/media/jobs — recent transcode jobs (live + persisted history)
router.get('/jobs', asyncRoute(async (req, res) => {
  res.json({ maxConcurrent: transcodeJobs.MAX_CONCURRENT, jobs: await transcodeJobs.listJobs() });
}));

// GET /api/admin/media/jobs/:id — single job with live progress
router.get('/jobs/:id', asyncRoute(async (req, res) => {
  try {
    res.json(await transcodeJobs.getJob(req.params.id));
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Job not found' });
    throw error;
  }
}));

// POST /api/admin/media/jobs/:id/cancel
router.post('/jobs/:id/cancel', (req, res, next) => {
  try {
    res.json(transcodeJobs.cancelJob(req.params.id));
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Job not found' });
    next(error);
  }
});

// POST /api/admin/media/jobs/:id/retry — re-run a failed/interrupted/cancelled job
router.post('/jobs/:id/retry', asyncRoute(async (req, res) => {
  try {
    const record = await mediaStore.getJobRecord(req.params.id);
    if (!record) return res.status(404).json({ error: 'Job not found' });
    if (['queued', 'running'].includes(record.status)) {
      return res.status(400).json({ error: 'Job is still active — cancel it first to retry' });
    }
    const item = await getItemById(record.itemId).catch(() => null);
    if (!item) return res.status(404).json({ error: 'Original content no longer exists' });

    const busy = transcodeJobs.getActiveSourcePaths();
    const { preset, options } = req.body || {};
    const presetId = PRESETS[preset] ? preset : (record.preset || 'browser');
    const trxOptions = normalizeTranscodeOptions({ ...(record.options || {}), ...(options || {}) });

    // Re-resolve the same episode/file, then re-analyze fresh
    const targets = resolveTargets(item, {
      season: record.season || undefined,
      episode: record.episode || undefined,
      allEpisodes: false,
    });
    const target = targets.find((t) => t.key === record.targetKey) || targets[0];
    if (!target) return res.status(404).json({ error: 'Target file no longer found' });
    const analysis = await analyzeTarget(target);
    if (!analysis.exists) return res.status(404).json({ error: 'Source file not found on server' });
    if (busy.has(analysis.filePath)) {
      return res.status(400).json({ error: 'This file already has a queued/running job' });
    }
    const job = transcodeJobs.createJob({ item, target, analysis, presetId, options: trxOptions });
    res.status(201).json(await transcodeJobs.getJob(job.id));
  } catch (error) {
    sendKnownError(res, error);
  }
}));

// DELETE /api/admin/media/jobs/:id/backup — delete the .orig-bak file to free space
router.delete('/jobs/:id/backup', asyncRoute(async (req, res) => {
  try {
    res.json(await transcodeJobs.deleteBackup(req.params.id));
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
    throw error;
  }
}));

// GET /api/admin/media/backups — all kept originals with sizes
router.get('/backups', asyncRoute(async (req, res) => {
  const items = await transcodeJobs.listBackups();
  const totalBytes = items.reduce((sum, b) => sum + (b.exists ? Number(b.sizeBytes || 0) : 0), 0);
  res.json({ totalBytes, count: items.length, items });
}));

// DELETE /api/admin/media/backups — delete ALL kept originals
router.delete('/backups', asyncRoute(async (req, res) => {
  const items = await transcodeJobs.listBackups();
  let deleted = 0;
  let sizeFreed = 0;
  const errors = [];
  for (const b of items) {
    try {
      const r = await transcodeJobs.deleteBackup(b.jobId);
      deleted += 1;
      sizeFreed += Number(r.sizeFreed || 0);
    } catch (error) {
      errors.push({ jobId: b.jobId, error: error.message });
    }
  }
  res.json({ deleted, sizeFreed, errors });
}));

// GET /api/admin/media/settings — auto-fix settings
router.get('/settings', asyncRoute(async (req, res) => {
  res.json(await mediaStore.getSettings());
}));

// PUT /api/admin/media/settings — update auto-fix settings
router.put('/settings', asyncRoute(async (req, res) => {
  res.json(await mediaStore.saveSettings(req.body || {}));
}));

// GET /api/admin/media/scan — library scan state (+ last saved report)
router.get('/scan', asyncRoute(async (req, res) => {
  res.json(await libraryScan.getScanState());
}));

// POST /api/admin/media/scan/start — scan whole library for incompatible files
router.post('/scan/start', asyncRoute(async (req, res) => {
  try {
    const { type } = req.body || {};
    res.status(202).json(await libraryScan.startLibraryScan({ type }));
  } catch (error) {
    if (error?.code === 'BUSY') return res.status(409).json({ error: error.message });
    throw error;
  }
}));

// POST /api/admin/media/scan/cancel
router.post('/scan/cancel', asyncRoute(async (req, res) => {
  res.json(libraryScan.cancelLibraryScan());
}));

// POST /api/admin/media/scan/queue — queue jobs for scan findings
router.post('/scan/queue', asyncRoute(async (req, res) => {
  try {
    const { keys, all, preset, options } = req.body || {};
    const presetId = PRESETS[preset] ? preset : 'browser';
    const trxOptions = normalizeTranscodeOptions(options || {});
    const state = await libraryScan.getScanState();
    const pool = state.status === 'running' ? state.found : ((state.lastReport || state).found || state.found || []);
    const wanted = all ? pool : pool.filter((f) => (keys || []).includes(`${f.itemId}:${f.targetKey}`));
    if (wanted.length === 0) return res.status(400).json({ error: 'No matching scan findings to queue' });
    if (wanted.length > 200) return res.status(400).json({ error: `Too many files (${wanted.length}, max 200 per batch)` });

    const busy = transcodeJobs.getActiveSourcePaths();
    const created = [];
    const seenPaths = new Set();
    for (const f of wanted) {
      try {
        if (busy.has(f.filePath) || seenPaths.has(f.filePath)) {
          created.push({ target: f.label, skipped: true, reason: 'Already queued' });
          continue;
        }
        const item = await getItemById(f.itemId).catch(() => null);
        if (!item) {
          created.push({ target: f.label, skipped: true, reason: 'Content no longer exists' });
          continue;
        }
        const targets = resolveTargets(item, { season: f.season || undefined, episode: f.episode || undefined, allEpisodes: false });
        const target = targets.find((t) => t.key === f.targetKey) || targets[0];
        if (!target) {
          created.push({ target: f.label, skipped: true, reason: 'Target no longer found' });
          continue;
        }
        const analysis = await analyzeTarget(target);
        if (!analysis.exists || analysis.verdict === 'compatible') {
          created.push({ target: f.label, skipped: true, reason: !analysis.exists ? 'File gone' : 'Already compatible now' });
          continue;
        }
        const job = transcodeJobs.createJob({ item, target, analysis, presetId, options: trxOptions });
        busy.add(analysis.filePath);
        seenPaths.add(analysis.filePath);
        created.push({ target: f.label, jobId: job.id, status: job.status });
      } catch (error) {
        created.push({ target: f.label, skipped: true, reason: String(error.message || error).slice(0, 200) });
      }
    }
    res.status(201).json({ preset: presetId, results: created });
  } catch (error) {
    sendKnownError(res, error);
  }
}));

module.exports = router;
