const { db } = require('./src/data/store/base');

const rootStateResult = await db.query("SELECT value FROM app_state WHERE key = 'root_state_requested-series'");
if (rootStateResult.rows.length > 0) {
  const rootState = rootStateResult.rows[0].value;
  
  if (rootState.folders) {
    const musafirEntry = Object.keys(rootState.folders).find(key => key.toLowerCase().includes('musafir'));
    if (musafirEntry) {
      console.log('Found Musafir Cafe entry:', musafirEntry);
      console.log('Removing fingerprint to force rescan...');
      delete rootState.folders[musafirEntry];
      
      await db.query("UPDATE app_state SET value = $1 WHERE key = 'root_state_requested-series'", [rootState]);
      console.log('✓ Musafir Cafe fingerprint cleared from root state');
    } else {
      console.log('No Musafir Cafe fingerprint found');
    }
  }
} else {
  console.log('No root state found');
}

process.exit(0);
