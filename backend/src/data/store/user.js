const { db, ensureContentStore, getAppState, setAppState } = require('./base');

async function ensureUser(externalId) {
  await ensureContentStore();
  const normalized = String(externalId || 'guest').trim() || 'guest';
  const inserted = await db.query(`INSERT INTO users (external_id, updated_at) VALUES ($1, NOW()) ON CONFLICT (external_id) DO UPDATE SET updated_at = NOW() RETURNING id, external_id`, [normalized]);
  return inserted.rows[0];
}

async function getWatchlistEntries(externalUserId) {
  const user = await ensureUser(externalUserId);
  const result = await db.query(`SELECT id, content_type, content_id, created_at FROM watchlist_entries WHERE user_id = $1 ORDER BY created_at DESC, id DESC`, [user.id]);
  return result.rows.map((row) => ({ id: Number(row.id), userId: user.external_id, contentType: row.content_type, contentId: Number(row.content_id), addedAt: row.created_at }));
}

async function addWatchlistEntry(externalUserId, contentType, contentId) {
  const user = await ensureUser(externalUserId);
  const result = await db.query(`INSERT INTO watchlist_entries (user_id, content_type, content_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, content_type, content_id) DO NOTHING RETURNING id, created_at`, [user.id, String(contentType), Number(contentId)]);
  if (!result.rows.length) return null;
  return { id: Number(result.rows[0].id), userId: user.external_id, contentType: String(contentType), contentId: Number(contentId), addedAt: result.rows[0].created_at };
}

async function removeWatchlistEntry(externalUserId, entryId) {
  const user = await ensureUser(externalUserId);
  const result = await db.query('DELETE FROM watchlist_entries WHERE id = $1 AND user_id = $2', [Number(entryId), user.id]);
  return result.rowCount > 0;
}

async function getWatchProgressEntries(externalUserId, { incompleteOnly = false, contentType = '', contentId = null } = {}) {
  const user = await ensureUser(externalUserId);
  const conditions = ['user_id = $1']; const params = [user.id];
  if (incompleteOnly) conditions.push('completed = FALSE');
  if (contentType) { params.push(String(contentType)); conditions.push(`content_type = $${params.length}`); }
  if (contentId !== null && contentId !== undefined) { params.push(Number(contentId)); conditions.push(`content_id = $${params.length}`); }
  const result = await db.query(`SELECT id, content_type, content_id, position, duration, completed, updated_at FROM watch_progress WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC, id DESC`, params);
  return result.rows.map((row) => ({ id: Number(row.id), userId: user.external_id, contentType: row.content_type, contentId: Number(row.content_id), position: Number(row.position || 0), duration: Number(row.duration || 0), completed: Boolean(row.completed), updatedAt: row.updated_at, last_position: Number(row.position || 0) }));
}

async function upsertWatchProgress(externalUserId, { contentType, contentId, position = 0, duration = 0, completed = false }) {
  const user = await ensureUser(externalUserId);
  const result = await db.query(`INSERT INTO watch_progress (user_id, content_type, content_id, position, duration, completed, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (user_id, content_type, content_id) DO UPDATE SET position = EXCLUDED.position, duration = EXCLUDED.duration, completed = EXCLUDED.completed, updated_at = NOW() RETURNING id, content_type, content_id, position, duration, completed, updated_at`, [user.id, String(contentType), Number(contentId), Number(position || 0), Number(duration || 0), Boolean(completed)]);
  const row = result.rows[0];
  return { id: Number(row.id), userId: user.external_id, contentType: row.content_type, contentId: Number(row.content_id), position: Number(row.position || 0), duration: Number(row.duration || 0), completed: Boolean(row.completed), updatedAt: row.updated_at, last_position: Number(row.position || 0) };
}

async function markWatchProgressComplete(externalUserId, { contentType, contentId }) {
  return upsertWatchProgress(externalUserId, { contentType, contentId, position: 0, duration: 0, completed: true });
}

function buildRecentSearchKey(externalUserId) {
  return `recent_searches:${String(externalUserId || 'guest').trim() || 'guest'}`;
}

async function recordRecentSearch(externalUserId, query, metadata = {}) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery || normalizedQuery.length < 2) return [];
  const key = buildRecentSearchKey(externalUserId);
  const current = await getAppState(key, { items: [] });
  const items = Array.isArray(current?.items) ? current.items : [];
  const now = new Date().toISOString();
  const nextItems = [{ query: normalizedQuery, type: String(metadata.type || '').trim(), genre: String(metadata.genre || '').trim(), language: String(metadata.language || '').trim(), year: String(metadata.year || '').trim(), searchedAt: now }, ...items.filter((item) => String(item.query || '').trim().toLowerCase() !== normalizedQuery.toLowerCase())].slice(0, 20);
  await setAppState(key, { items: nextItems });
  return nextItems;
}

async function getRecentSearches(externalUserId, limit = 10) {
  const key = buildRecentSearchKey(externalUserId);
  const state = await getAppState(key, { items: [] });
  return (Array.isArray(state?.items) ? state.items : []).slice(0, Math.max(1, Number(limit) || 10));
}

module.exports = {
  ensureUser,
  getWatchlistEntries,
  addWatchlistEntry,
  removeWatchlistEntry,
  getWatchProgressEntries,
  upsertWatchProgress,
  markWatchProgressComplete,
  recordRecentSearch,
  getRecentSearches,
};
