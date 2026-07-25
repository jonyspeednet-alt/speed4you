const express = require('express');
const router = express.Router();

const WEBHOOK_SECRET = String(process.env.WEBHOOK_SECRET || '').trim();

router.post('/scan', async (req, res) => {
  const provided = req.headers['x-webhook-secret'] || req.query.secret || req.body?.secret;
  if (WEBHOOK_SECRET && provided !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid or missing webhook secret' });
  }
  try {
    const { startScanJob } = require('../services/scanner');
    const job = await startScanJob([]);
    res.status(202).json({ ok: true, jobId: job?.id || null });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to start scan' });
  }
});

router.get('/health', (req, res) => {
  res.json({ ok: true, webhookConfigured: !!WEBHOOK_SECRET });
});

router.get('/last-scan', async (req, res) => {
  try {
    const { getAppState } = require('../data/store');
    const summary = await getAppState('last_scan_summary', null);
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
