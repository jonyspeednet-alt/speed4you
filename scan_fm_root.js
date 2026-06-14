const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { ensureContentStore } = require('../src/data/store');
const scanner = require('../src/services/scanner');

async function run() {
  console.log('Initializing database connection...');
  await ensureContentStore();
  
  console.log('Starting scan of series-f-m root...');
  const result = await scanner.scanSelectedRoots(['series-f-m'], (prog) => {
    if (prog && prog.roots && prog.roots['series-f-m']) {
      const r = prog.roots['series-f-m'];
      console.log(`Progress: ${r.processed}/${r.totalCandidates} | Created: ${r.created} | Updated: ${r.updated}`);
    }
  });
  
  console.log('Scan result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
