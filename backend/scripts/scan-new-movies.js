const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { ensureContentStore } = require('../src/data/store');
const scanner = require('../src/services/scanner');

async function run() {
  console.log('Initializing database connection...');
  await ensureContentStore();

  const targetRoot = 'new-movies-1';
  console.log(`Starting targeted scan of ${targetRoot} root...`);
  const result = await scanner.scanSelectedRoots([targetRoot], (prog) => {
    if (prog && prog.roots && prog.roots[targetRoot]) {
      const r = prog.roots[targetRoot];
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
