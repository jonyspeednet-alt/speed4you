/**
 * inspect_4_problem_titles.js
 * Inspect exact DB rows for the 4 problem titles reported by user.
 */
require('dotenv').config();
const { query } = require('../config/database');

async function inspect() {
  const titles = [
    'Taskaree',
    'Objection My Lord',
    'Made In India',
    'Dil Deewana Ho Gaya'
  ];

  for (const t of titles) {
    const res = await query(`
      SELECT id, title, content_type, status, metadata_status,
             payload->>'poster' AS poster,
             payload->>'backdrop' AS backdrop,
             payload->>'tmdbId' AS tmdb_id,
             payload->>'metadataConfidence' AS confidence,
             payload->>'parsedTitle' AS parsed_title,
             payload->>'sourcePath' AS source_path
      FROM content_catalog
      WHERE title ILIKE $1 OR payload->>'sourcePath' ILIKE $1
    `, [`%${t}%`]);

    console.log(`\n=== QUERY: "${t}" (${res.rows.length} rows) ===`);
    res.rows.forEach(r => {
      console.log(`ID:${r.id} | title:"${r.title}" | type:${r.content_type} | status:${r.status}`);
      console.log(`  metaStatus:${r.metadata_status} | tmdbId:${r.tmdb_id} | confidence:${r.confidence}`);
      console.log(`  parsedTitle:"${r.parsed_title}"`);
      console.log(`  poster:"${r.poster || ''}"`);
      console.log(`  sourcePath:"${r.source_path}"`);
    });
  }

  process.exit(0);
}

inspect().catch(console.error);
