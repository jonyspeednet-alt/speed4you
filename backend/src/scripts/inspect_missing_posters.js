/**
 * inspect_missing_posters.js
 * Inspects all DB records that are missing posters
 */
require('dotenv').config();
const { query } = require('../config/database');

async function inspectMissingPosters() {
  console.log('=== INSPECTING CONTENT CATALOG ITEMS MISSING POSTERS ===\n');

  const res = await query(`
    SELECT count(*) FROM content_catalog
    WHERE payload->>'poster' IS NULL
       OR payload->>'poster' = ''
       OR payload->>'poster' = 'null'
  `);

  const count = Number(res.rows[0].count);
  console.log(`TOTAL ITEMS MISSING POSTER: ${count}`);

  if (count > 0) {
    const list = await query(`
      SELECT id, title, content_type,
             payload->>'sourcePath' AS source_path,
             payload->>'backdrop' AS backdrop,
             created_at
      FROM content_catalog
      WHERE payload->>'poster' IS NULL
         OR payload->>'poster' = ''
         OR payload->>'poster' = 'null'
      ORDER BY id ASC
    `);

    console.log('\n--- COMPLETE LIST OF ITEMS MISSING POSTERS ---');
    list.rows.forEach((r, idx) => {
      console.log(`${idx + 1}. ID:${r.id} | title:"${r.title}" | type:${r.content_type}`);
      console.log(`   path:${r.source_path}`);
    });
  }

  process.exit(0);
}

inspectMissingPosters().catch(console.error);
