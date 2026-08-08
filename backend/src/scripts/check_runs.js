require('dotenv').config();
const { query } = require('../config/database');

async function checkRuns() {
  const runs = await query("SELECT * FROM scanner_runs ORDER BY id DESC LIMIT 10");
  console.log('=== RECENT SCANNER RUNS ===');
  console.log(JSON.stringify(runs.rows, null, 2));

  const rootStats = await query("SELECT source_root_id, count(*), status FROM content_catalog GROUP BY source_root_id, status");
  console.log('\n=== CONTENT BY ROOT ID ===');
  console.log(JSON.stringify(rootStats.rows, null, 2));

  process.exit(0);
}

checkRuns().catch(console.error);
