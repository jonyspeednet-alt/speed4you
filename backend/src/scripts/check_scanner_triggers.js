require('dotenv').config();
const { query } = require('../config/database');

async function main() {
  const res = await query(`
    SELECT id, status, started_at, completed_at, trigger_source
    FROM scanner_runs
    ORDER BY started_at DESC
    LIMIT 15
  `);
  console.log('=== RECENT SCANNER RUNS (TRIGGER SOURCES) ===');
  console.table(res.rows);
  process.exit(0);
}
main().catch(console.error);
