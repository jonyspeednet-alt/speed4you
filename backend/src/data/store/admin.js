const { db, appStateCache, ensureContentStore, getAppState, setAppState } = require('./base');
const { listItems } = require('./content');

async function getStats() {
  await ensureContentStore();
  const res = await db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'published')::int AS published, COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts, COUNT(*) FILTER (WHERE content_type = 'movie')::int AS movies, COUNT(*) FILTER (WHERE content_type = 'series')::int AS series, COUNT(*) FILTER (WHERE source_type = 'scanner' AND status = 'draft')::int AS scanner_drafts, COUNT(*) FILTER (WHERE source_type = 'scanner' AND status = 'draft' AND duplicate_count > 0)::int AS duplicate_drafts FROM content_catalog`);
  const row = res.rows[0];
  return { totalContent: row.total, publishedContent: row.published, draftContent: row.drafts, totalMovies: row.movies, totalSeries: row.series, scannerDrafts: row.scanner_drafts, duplicateDrafts: row.duplicate_drafts };
}

async function getRecentItems(limit = 10) {
  const { items } = await listItems({ status: 'published' }, 0, limit);
  return items;
}

async function findAdminByUsername(username) {
  await ensureContentStore();
  const result = await db.query('SELECT id, username, ***REMOVED***_hash, role, created_at, updated_at, last_login FROM admin_users WHERE username = $1 LIMIT 1', [String(username || '').trim()]);
  return result.rows[0] || null;
}

async function touchAdminLogin(id) {
  await ensureContentStore();
  await db.query('UPDATE admin_users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [Number(id)]);
}

// Admin user CRUD
async function listAdminUsers() {
  await ensureContentStore();
  const result = await db.query(
    'SELECT id, username, role, created_at, updated_at, last_login FROM admin_users ORDER BY created_at ASC',
  );
  return result.rows;
}

async function createAdminUser(username, ***REMOVED***Hash, role) {
  await ensureContentStore();
  const result = await db.query(
    `INSERT INTO admin_users (username, ***REMOVED***_hash, role) VALUES ($1, $2, $3)
     RETURNING id, username, role, created_at, updated_at, last_login`,
    [String(username).trim(), ***REMOVED***Hash, role || 'admin'],
  );
  return result.rows[0] || null;
}

async function updateAdminUser(id, fields) {
  await ensureContentStore();
  const sets = [];
  const vals = [];
  let idx = 1;
  if (fields.username !== undefined) { sets.push(`username = $${idx++}`); vals.push(String(fields.username).trim()); }
  if (fields.***REMOVED***_hash !== undefined) { sets.push(`***REMOVED***_hash = $${idx++}`); vals.push(fields.***REMOVED***_hash); }
  if (fields.role !== undefined) { sets.push(`role = $${idx++}`); vals.push(fields.role); }
  if (!sets.length) return null;
  sets.push(`updated_at = NOW()`);
  vals.push(Number(id));
  const result = await db.query(
    `UPDATE admin_users SET ${sets.join(', ')} WHERE id = $${idx}
     RETURNING id, username, role, created_at, updated_at, last_login`,
    vals,
  );
  return result.rows[0] || null;
}

async function deleteAdminUser(id) {
  await ensureContentStore();
  const result = await db.query(
    `DELETE FROM admin_users WHERE id = $1 RETURNING id`,
    [Number(id)],
  );
  return result.rows.length > 0;
}

module.exports = {
  getStats,
  getRecentItems,
  findAdminByUsername,
  touchAdminLogin,
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
};
