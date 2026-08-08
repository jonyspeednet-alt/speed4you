const { db } = require('./src/data/store/base');

async function addRequestedSeriesRoot() {
  // Get current scanner_roots configuration
  const rootsResult = await db.query("SELECT value FROM app_state WHERE key = 'scanner_roots'");
  if (rootsResult.rows.length === 0) {
    console.log('No scanner_roots configuration found');
    process.exit(1);
  }
  
  const currentRoots = rootsResult.rows[0].value;
  console.log('Current scanner roots:', currentRoots.length);
  
  // Check if requested-series already exists
  const exists = currentRoots.find(root => root.id === 'requested-series');
  if (exists) {
    console.log('requested-series root already exists');
    process.exit(0);
  }
  
  // Add the requested-series root
  const newRoot = {
    id: 'requested-series',
    type: 'series',
    label: 'Requested Series',
    category: 'TV Series',
    language: 'Multi',
    scanPath: '/var/www/html/Requested/Series',
    publicBaseUrl: '/Requested/Series'
  };
  
  currentRoots.push(newRoot);
  
  // Update the configuration
  await db.query("UPDATE app_state SET value = $1 WHERE key = 'scanner_roots'", [currentRoots]);
  
  console.log('✓ Added requested-series root to scanner configuration');
  console.log('New root:', newRoot);
  console.log('Total roots now:', currentRoots.length);
  
  process.exit(0);
}

addRequestedSeriesRoot().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
