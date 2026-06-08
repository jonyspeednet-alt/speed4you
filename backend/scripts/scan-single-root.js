const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { ensureContentStore } = require('../src/data/store');
const scanner = require('../src/services/scanner');

async function run() {
  console.log('Initializing database connection...');
  await ensureContentStore();

  console.log('Starting targeted scan of 3d-movies root...');
  const result = await scanner.scanSelectedRoots(['3d-movies'], (prog) => {
    if (prog && prog.roots && prog.roots['3d-movies']) {
      const r = prog.roots['3d-movies'];
      console.log(`Progress: ${r.processed} / ${r.totalCandidates} | Created: ${r.created} | Discovered: ${r.discovered}`);
    }
  });

  console.log('Scan completed successfully:', JSON.stringify(result, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error during scan:', err);
  process.exit(1);
});
