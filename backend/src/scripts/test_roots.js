require('dotenv').config();
const { getEffectiveRoots, loadScannerRoots } = require('../services/scanner');

async function testRoots() {
  console.log('=== LOADED SCANNER ROOTS FROM DB ===');
  const loaded = loadScannerRoots();
  console.log(JSON.stringify(loaded, null, 2));

  console.log('\n=== EFFECTIVE ROOTS ===');
  const effective = getEffectiveRoots();
  console.log(JSON.stringify(effective, null, 2));

  process.exit(0);
}

testRoots().catch(console.error);
