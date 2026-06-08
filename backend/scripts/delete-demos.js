require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

async function main() {
  await ensureContentStore();

  const DEMO_IDS = [1001, 1002, 1003, 1004, 1005];

  // Show what we're deleting
  console.log('=== DELETING DEMO ENTRIES ===');
  for (const id of DEMO_IDS) {
    const r = await db.query("SELECT id, payload->>'title' as title FROM content_catalog WHERE id = $1", [id]);
    if (r.rows.length) {
      console.log(`  Deleting id=${r.rows[0].id} | ${r.rows[0].title}`);
    }
  }

  // Delete them
  const result = await db.query(
    "DELETE FROM content_catalog WHERE id = ANY($1::int[])",
    [DEMO_IDS]
  );

  console.log(`\n✅ Deleted ${result.rowCount} demo entries`);

  // Verify
  const check = await db.query(
    "SELECT COUNT(*) as cnt FROM content_catalog WHERE COALESCE(payload->>'sourceType', '') != 'scanner'"
  );
  console.log(`Remaining non-scanner items: ${check.rows[0].cnt}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
