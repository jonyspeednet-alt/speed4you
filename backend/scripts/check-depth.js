require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

async function main() {
  await ensureContentStore();
  const res = await db.query("SELECT id, max_depth FROM scanner_roots");
  res.rows.forEach(r => console.log(`Root: ${r.id} | max_depth in DB: ${r.max_depth}`));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
