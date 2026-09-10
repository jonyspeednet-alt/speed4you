const express = require('express');
const rateLimit = require('express-rate-limit');
const mediaStore = require('../services/media-store');

const router = express.Router();

// Strict: max 5 reports / 10 min per IP (abuse-proof, guests allowed)
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports. Please try again later.' },
});

// POST /api/reports — viewer reports a playback problem (no login needed)
router.post('/', reportLimiter, async (req, res, next) => {
  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const result = await mediaStore.submitReport(req.body || {}, ip);
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    if (error?.code === 'BAD_INPUT') return res.status(400).json({ error: error.message });
    next(error);
  }
});

// GET /api/reports/issues — allowed issue types (for the report dialog)
router.get('/issues', (req, res) => {
  res.json([
    { id: 'no_sound', label: 'সাউন্ড আসছে না' },
    { id: 'no_video', label: 'ভিডিও চলছে না' },
    { id: 'buffering', label: 'আটকে আটকে চলছে' },
    { id: 'wrong_content', label: 'ভুল ভিডিও চলছে' },
    { id: 'other', label: 'অন্য সমস্যা' },
  ]);
});

module.exports = router;
