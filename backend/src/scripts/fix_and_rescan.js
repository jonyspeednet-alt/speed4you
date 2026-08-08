require('dotenv').config();
const { query } = require('../config/database');
const { refreshScannerCaches } = require('../data/store');
const { scanSelectedRoots } = require('../services/scanner');

async function fixAndRescan() {
  console.log('1. Cleaning up corrupted requested-series database entries...');
  // Delete catalog items under requested-series root to start clean scan with fixed code
  const deleteRes = await query("DELETE FROM content_catalog WHERE source_root_id = 'requested-series' OR (payload->>'sourcePath' LIKE '%/Requested/Series/%')");
  console.log(`Deleted ${deleteRes.rowCount} corrupted entries.`);

  console.log('\n2. Refreshing scanner caches...');
  await refreshScannerCaches();

  console.log('\n3. Starting fresh scanner run for requested-series root...');
  const result = await scanSelectedRoots(['requested-series'], (progress) => {
    console.log(`[PROGRESS] Active: ${progress.activeRootId || ''}, Processed: ${progress.processed || 0}/${progress.totalCandidates || 0}, Created: ${progress.created || 0}, Updated: ${progress.updated || 0}`);
  });

  console.log('\n=== SCAN FINISHED ===');
  console.log('Result summary:', JSON.stringify({
    created: result.created,
    updated: result.updated,
    deleted: result.deleted,
    unchanged: result.unchanged,
    errors: result.errors?.length || 0,
  }));

  console.log('\n4. Verifying final content_catalog count for /Requested/Series/...');
  const dbRes = await query("SELECT id, title, status, payload FROM content_catalog WHERE content_type = 'series'");
  const reqInDb = dbRes.rows.filter(r => JSON.stringify(r.payload || {}).includes('/Requested/Series/'));

  console.log('========================================');
  console.log(`FINAL TOTAL SERIES PUBLISHED IN DB: ${reqInDb.length}`);
  console.log('========================================');

  const statusCounts = {};
  reqInDb.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  console.log('Status breakdown:', statusCounts);

  reqInDb.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.status.toUpperCase()}] ${r.title} (ID: ${r.id})`);
  });

  process.exit(0);
}

fixAndRescan().catch(err => {
  console.error('Error during fix and rescan:', err);
  process.exit(1);
});
