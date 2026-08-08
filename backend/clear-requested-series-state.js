const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'isp_entertainment',
  user: 'postgres',
  password: 'postgres',
});

async function clearRequestedSeriesState() {
  try {
    const result = await pool.query("SELECT value FROM app_state WHERE key = 'scanner_state'");
    if (result.rows.length > 0) {
      let state = result.rows[0].value;
      
      // Parse if string
      if (typeof state === 'string') {
        state = JSON.parse(state);
      }
      
      if (typeof state === 'object' && state.roots && state.roots['requested-series']) {
        console.log('Found requested-series root, clearing all folders...');
        state.roots['requested-series'].folders = {};
        
        await pool.query(
          "UPDATE app_state SET value = $1 WHERE key = 'scanner_state'",
          [JSON.stringify(state)]
        );
        
        console.log('Requested-series state cleared successfully');
      } else {
        console.log('Invalid state structure or no requested-series root');
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

clearRequestedSeriesState();
