const { db, appStateCache, ensureContentStore, getAppState, setAppState } = require('./base');
const { listItems } = require('./content');

async function getStats() {
  await ensureContentStore();
  const res = await db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'published')::int AS published, COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts, COUNT(*) FILTER (WHERE content_type = 'movie')::int AS movies, COUNT(*) FILTER (WHERE content_type = 'series')::int AS series, COUNT(*) FILTER (WHERE source_type = 'scanner' AND status = 'draft')::int AS scanner_drafts, COUNT(*) FILTER (WHERE source_type = 'scanner' AND status = 'draft' AND duplicate_count > 0)::int AS duplicate_drafts FROM content_catalog`);
  const row = res.rows[0];
  return { totalContent: row.total, publishedContent: row.published, draftContent: row.drafts, totalMovies: row.movies, totalSeries: row.series, scannerDrafts: row.scanner_drafts, duplicateDrafts: row.duplicate_drafts };
}

async function getRecentItems(limit = 10) {
  const { items } = await listItems({}, 0, limit);
  return items;
}

async function findAdminByUsername(username) {
  await ensureContentStore();
  const result = await db.query('SELECT id, username, password_hash, role, created_at, updated_at, last_login FROM admin_users WHERE username = $1 LIMIT 1', [String(username || '').trim()]);
  return result.rows[0] || null;
}

async function touchAdminLogin(id) {
  await ensureContentStore();
  await db.query('UPDATE admin_users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [Number(id)]);
}

async function getMediaNormalizerState() {
  return getAppState('media_normalizer_state', null);
}

async function saveMediaNormalizerState(payload) {
  return setAppState('media_normalizer_state', payload);
}

function getMediaNormalizerLog(limit = 25) {
  const lines = appStateCache.get('media_normalizer_log')?.lines || [];
  return lines.slice(-Math.max(1, limit));
}

async function appendMediaNormalizerLog(lines = []) {
  const current = appStateCache.get('media_normalizer_log')?.lines || [];
  const next = [...current, ...lines.map((line) => String(line))].slice(-500);
  return setAppState('media_normalizer_log', { lines: next });
}

module.exports = {
  getStats,
  getRecentItems,
  findAdminByUsername,
  touchAdminLogin,
  getMediaNormalizerState,
  saveMediaNormalizerState,
  getMediaNormalizerLog,
  appendMediaNormalizerLog,
};
