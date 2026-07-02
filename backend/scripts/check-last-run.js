'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/config/database');

async function main() {
  const result = await db.query(
    'SELECT id, status, started_at, completed_at, total_created, total_updated, total_unchanged, total_duplicate_drafts, errors FROM scanner_runs ORDER BY started_at DESC LIMIT 3'
  );
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
