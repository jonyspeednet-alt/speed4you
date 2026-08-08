const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'isp_entertainment',
  user: 'postgres',
  password: 'postgres',
});

async function checkMusafirInState() {
  try {
    const result = await pool.query("SELECT value FROM app_state WHERE key = 'scanner_state'");
    if (result.rows.length > 0) {
      const rawValue = result.rows[0].value;
      console.log('Raw value type:', typeof rawValue);
      
      let state;
      if (typeof rawValue === 'string') {
        state = JSON.parse(rawValue);
      } else {
        state = rawValue;
      }
      
      const requestedSeries = state.roots['requested-series'];
      
      if (requestedSeries) {
        console.log('Requested Series folders:', Object.keys(requestedSeries.folders || {}).length);
        console.log('Musafir Cafe in state:', requestedSeries.folders['Musafir Cafe (2026)'] ? 'YES' : 'NO');
        
        if (requestedSeries.folders['Musafir Cafe (2026)']) {
          console.log('Musafir Cafe data:', JSON.stringify(requestedSeries.folders['Musafir Cafe (2026)'], null, 2));
        }
      } else {
        console.log('No requested-series root found in state');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
  
  await pool.end();
  process.exit(0);
}

checkMusafirInState();
