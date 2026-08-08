const { db } = require('./src/data/store/base');

(async () => {
  const rootStateResult = await db.query("SELECT value FROM app_state WHERE key = 'root_state_requested-series'");
  if (rootStateResult.rows.length > 0) {
    const rootState = rootStateResult.rows[0].value;
    console.log('Root state for requested-series:', JSON.stringify(rootState, null, 2));
    
    if (rootState.folders) {
      const musafirEntry = Object.keys(rootState.folders).find(key => key.toLowerCase().includes('musafir'));
      if (musafirEntry) {
        console.log('\n=== Musafir Cafe State Entry ===');
        console.log('Key:', musafirEntry);
        console.log('State:', JSON.stringify(rootState.folders[musafirEntry], null, 2));
      } else {
        console.log('\nNo Musafir Cafe fingerprint found in root state');
      }
    }
  } else {
    console.log('No root state found for requested-series');
  }
  
  process.exit(0);
})();
