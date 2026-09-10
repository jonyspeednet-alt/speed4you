const express = require('express');
const { getItemById } = require('../data/store');
const {
  PRESETS,
  analyzeContent,
  analyzeTarget,
  parseContentInput,
  resolveTargets,
} = require('../services/media-compat');
const transcodeJobs = require('../services/transcode-jobs');

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
    const { input, preset } = req.body || {};
    const presetId = PRESETS[preset] ? preset : 'browser';
    const options = pickOptions(req.body, req.query);

    const key = parseContentInput(input);
    const item = await getItemById(key).catch(() => null);
    if (!item) {
      return res.status(404).json({ error: 'Content not found for that link/ID' });
    }
    const targets = resolveTargets(item, options);
    if (targets.length > 60) {
      return res.status(400).json({ error: `Too many files (${targets.length}). Pick a single season/episode.` });
    }
    if (targets.length === 0) {
      return res.status(404).json({ error: 'No playable files found for this content' });
    }

    const created = [];
    const busyPaths = new Set(
      transcodeJobs.listJobs()
        .filter((j) => j.status === 'queued' || j.status === 'running')
        .map((j) => j.sourcePath)
    );
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
        job = transcodeJobs.createJob({ item, target, analysis, presetId });
      } catch (error) {
        created.push({ target: target.label, skipped: true, reason: error.message });
        continue;
      }
      busyPaths.add(analysis.filePath);
      created.push({ target: target.label, jobId: job.id, status: job.status });
    }

    const jobs = created.filter((c) => c.jobId).map((c) => transcodeJobs.getJob(c.jobId));
    res.status(201).json({ preset: presetId, results: created, jobs });
  } catch (error) {
    sendKnownError(res, error);
  }
}));

// GET /api/admin/media/presets
router.get('/presets', (req, res) => {
  res.json(Object.values(PRESETS));
});

// GET /api/admin/media/jobs — recent transcode jobs
router.get('/jobs', (req, res) => {
  res.json({ maxConcurrent: transcodeJobs.MAX_CONCURRENT, jobs: transcodeJobs.listJobs() });
});

// GET /api/admin/media/jobs/:id — single job with live progress
router.get('/jobs/:id', (req, res, next) => {
  try {
    res.json(transcodeJobs.getJob(req.params.id));
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Job not found' });
    next(error);
  }
});

// POST /api/admin/media/jobs/:id/cancel
router.post('/jobs/:id/cancel', (req, res, next) => {
  try {
    res.json(transcodeJobs.cancelJob(req.params.id));
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Job not found' });
    next(error);
  }
});

module.exports = router;
