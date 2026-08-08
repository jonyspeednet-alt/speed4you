require('dotenv').config();
const { refreshScannerCaches } = require('../data/store');
const { scanSelectedRoots } = require('../services/scanner');

async function testScan() {
  console.log('Refreshing scanner caches from DB...');
  await refreshScannerCaches();

  console.log('Starting scan for requested-series root...');
  const result = await scanSelectedRoots(['requested-series'], (progress) => {
    console.log(`[PROGRESS] ActiveRoot: ${progress.activeRootId || ''}, Processed: ${progress.processed || 0}/${progress.totalCandidates || 0}, Created: ${progress.created || 0}, Updated: ${progress.updated || 0}`);
  });
  console.log('\n=== SCAN RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

testScan().catch(err => {
  console.error('Scan Error:', err);
  process.exit(1);
});
