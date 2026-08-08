const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'isp_entertainment',
  user: 'postgres',
  password: 'postgres',
});

async function clearMusafirState() {
  try {
    const result = await pool.query("SELECT value FROM app_state WHERE key = 'scanner_state'");
    if (result.rows.length > 0) {
      let state = result.rows[0].value;
      
      // Parse if string
      if (typeof state === 'string') {
        state = JSON.parse(state);
      }
      
      if (typeof state === 'object' && state.roots && state.roots['requested-series']) {
        const requestedSeries = state.roots['requested-series'];
        
        if (requestedSeries.folders && requestedSeries.folders['Musafir Cafe (2026)']) {
          console.log('Found Musafir Cafe in state, deleting...');
          delete requestedSeries.folders['Musafir Cafe (2026)'];
          
          await pool.query(
            "UPDATE app_state SET value = $1 WHERE key = 'scanner_state'",
            [JSON.stringify(state)]
          );
          
          console.log('Musafir Cafe state cleared successfully');
        } else {
          console.log('Musafir Cafe not found in state folders');
        }
      } else {
        console.log('Invalid state structure');
      }
    } else {
      console.log('No scanner state found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
  process.exit(0);
}

clearMusafirState();
