require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

async function main() {
  await ensureContentStore();

  // Check item 1001
  const item = await db.query(
    "SELECT id, payload->>'title' as title, payload->>'sourceType' as src_type, payload->>'sourcePath' as src_path, payload->>'videoUrl' as video_url, status, payload->>'category' as cat FROM content_catalog WHERE id = $1",
    [1001]
  );
  console.log('=== ITEM 1001 ===');
  if (item.rows.length) {
    console.log(JSON.stringify(item.rows[0], null, 2));
  } else {
    console.log('Not found');
  }

  // Find demo/test entries - items with no real source or scanner path
  console.log('\n=== POTENTIAL DEMO ENTRIES (sourceType != scanner, first 50) ===');
  const demos = await db.query(
    "SELECT id, payload->>'title' as title, payload->>'sourceType' as src_type, payload->>'sourcePath' as src_path, status FROM content_catalog WHERE COALESCE(payload->>'sourceType', '') != 'scanner' ORDER BY id ASC LIMIT 50"
  );
  demos.rows.forEach(r => console.log(`  id=${r.id} | src=${r.src_type || 'null'} | status=${r.status} | ${r.title}`));
  console.log(`  Count: ${demos.rowCount}`);

  // Also count total non-scanner items
  const countRes = await db.query(
    "SELECT COUNT(*) as cnt FROM content_catalog WHERE COALESCE(payload->>'sourceType', '') != 'scanner'"
  );
  console.log(`\n  Total non-scanner items: ${countRes.rows[0].cnt}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
