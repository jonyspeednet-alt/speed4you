require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

async function main() {
  await ensureContentStore();
  const r = await db.query('SELECT payload FROM content_catalog WHERE id = 5554');
  console.log(JSON.stringify(r.rows[0]?.payload, null, 2));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
