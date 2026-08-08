const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query(`
    SELECT id, title, scan_signature, source_root_id, status, created_at, updated_at 
    FROM content_catalog 
    WHERE title ILIKE '%Musafir%' OR scan_signature ILIKE '%musafir%'
    ORDER BY created_at DESC
  `);
  
  console.log('Existing Musafir Cafe entries:', result.rows.length);
  if (result.rows.length > 0) {
    console.log('Entries:');
    result.rows.forEach(row => {
      console.log('- ID: ' + row.id + ', Title: ' + row.title + ', Signature: ' + row.scan_signature + ', Status: ' + row.status);
    });
  }
  
  const stateResult = await db.query("SELECT value FROM app_state WHERE key = 'scanner_runtime'");
  if (stateResult.rows.length > 0) {
    const state = stateResult.rows[0].value;
    console.log('Scanner runtime state:', JSON.stringify(state, null, 2));
  }
  
  const rootStateResult = await db.query("SELECT value FROM app_state WHERE key = 'root_state_requested-series'");
  if (rootStateResult.rows.length > 0) {
    const rootState = rootState.rows[0].value;
    console.log('Root state for requested-series:', JSON.stringify(rootState, null, 2));
  }
  
  process.exit(0);
})();
