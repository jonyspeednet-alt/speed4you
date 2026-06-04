// check-id.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');
const id = process.argv[2];
async function main() {
  await ensureContentStore();
  const res = await db.query(`SELECT id, payload->>'title' as title, payload->>'type' as type, status FROM content_catalog WHERE id = $1`, [id]);
  console.log(JSON.stringify(res.rows[0] || null, null, 2));
}
main().catch(err => { console.error(err); process.exit(1); });
