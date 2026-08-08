/**
 * inspect_not_found_status.js
 * Inspects all DB records where metadata_status = 'not_found'
 */
require('dotenv').config();
const { query } = require('../config/database');

async function inspectNotFound() {
  console.log('=== INSPECTING METADATA_STATUS = NOT_FOUND ===\n');

  const res = await query(`
    SELECT count(*) FROM content_catalog WHERE metadata_status = 'not_found'
  `);

  console.log(`Total items with metadata_status = 'not_found': ${res.rows[0].count}`);

  const sample = await query(`
    SELECT id, title, content_type, status, metadata_status,
           payload->>'poster' AS poster,
           payload->>'sourcePath' AS source_path,
           payload->>'parsedTitle' AS parsed_title
    FROM content_catalog
    WHERE metadata_status = 'not_found'
    LIMIT 25
  `);

  console.log('\n--- SAMPLE 25 NOT_FOUND ITEMS ---');
  sample.rows.forEach(r => {
    console.log(`ID:${r.id} | title:"${r.title}" | type:${r.content_type} | status:${r.status} | poster:${Boolean(r.poster && r.poster.startsWith('http'))}`);
    console.log(`  parsedTitle:"${r.parsed_title}" | path:${r.source_path}`);
  });

  process.exit(0);
}

inspectNotFound().catch(console.error);
