require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');
const { refreshScannerCaches } = require('../src/data/store/scanner');

async function main() {
  await ensureContentStore();
  
  // 1. Check scanner roots
  await refreshScannerCaches();
  const { loadScannerRoots } = require('../src/data/store/scanner');
  const roots = loadScannerRoots();
  console.log('=== SCANNER ROOTS ===');
  roots.forEach(r => {
    const fs = require('fs');
    console.log(`  ${r.id} | type=${r.type} | exists=${fs.existsSync(r.scanPath)} | path=${r.scanPath}`);
  });
  
  // 2. Find Brave movie
  console.log('\n=== BRAVE SEARCH ===');
  const braveResult = await db.query(
    "SELECT id, payload->>'title' as title, status, metadata_status FROM content_catalog WHERE LOWER(payload->>'title') LIKE '%brave%' LIMIT 10"
  );
  if (braveResult.rows.length) {
    braveResult.rows.forEach(r => console.log(`  id=${r.id} title=${r.title} status=${r.status} meta=${r.metadata_status}`));
  } else {
    console.log('  No Brave entries found');
  }
  
  // 3. Count totals
  const counts = await db.query(
    "SELECT status, COUNT(*) as cnt FROM content_catalog GROUP BY status ORDER BY status"
  );
  console.log('\n=== STATUS COUNTS ===');
  counts.rows.forEach(r => console.log(`  ${r.status}: ${r.cnt}`));
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
