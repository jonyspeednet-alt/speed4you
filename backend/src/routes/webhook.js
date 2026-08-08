const express = require('express');
const router = express.Router();
const { getItemById } = require('../data/store');
const { rescanItem } = require('../services/scanner');

const WEBHOOK_SECRET = String(process.env.WEBHOOK_SECRET || '').trim();

function requireSecret(req, res, next) {
  if (!WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook not configured' });
  }
  const provided = req.headers['x-webhook-secret'] || req.query.secret || req.body?.secret;
  if (provided !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid or missing webhook secret' });
  }
  next();
}

router.post('/scan', requireSecret, async (req, res) => {
  try {
    const rootId = req.query.rootId || req.body?.rootId || '';
    const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
    const rootIds = rootId ? [rootId] : [];
    const { startScanJob } = require('../services/scanner');
    const job = await startScanJob(rootIds, { dryRun, triggerSource: 'webhook' });
    res.status(202).json({ ok: true, jobId: job?.id || null, rootIds, dryRun });
  } catch (err) {
    const isConflict = err.message && err.message.toLowerCase().includes('already running');
    res.status(isConflict ? 409 : 500).json({ error: err.message || 'Failed to start scan' });
  }
});

router.post('/rescan/:itemId', requireSecret, async (req, res) => {
  try {
    const itemId = String(req.params.itemId || '').trim();
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const item = await getItemById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const result = await rescanItem(item);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to rescan item' });
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
