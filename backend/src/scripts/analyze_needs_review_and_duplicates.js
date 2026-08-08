/**
 * analyze_needs_review_and_duplicates.js
 * Inspects details of the 38 Needs Review items and 69 Duplicate items
 */
require('dotenv').config();
const { query } = require('../config/database');

async function analyze() {
  console.log('=== ANALYZING 38 NEEDS REVIEW & 69 DUPLICATES ===\n');

  // 1. Needs Review
  const nrRes = await query(`
    SELECT id, title, content_type, status, metadata_status,
           payload->>'poster' AS poster,
           payload->>'metadataConfidence' AS conf,
           payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE metadata_status = 'needs_review'
    ORDER BY title
  `);

  console.log(`--- NEEDS REVIEW ITEMS (${nrRes.rows.length}) ---`);
  nrRes.rows.forEach(r => {
    console.log(`ID:${r.id} | title:"${r.title}" | conf:${r.conf} | poster:${Boolean(r.poster && r.poster.startsWith('http'))} | path:${r.source_path}`);
  });

  // 2. Duplicates
  const dupRes = await query(`
    SELECT id, title, content_type, status, duplicate_count,
           payload->>'scanSignature' AS sig,
           payload->>'sourcePath' AS source_path,
           payload->>'fileSize' AS file_size
    FROM content_catalog
    WHERE duplicate_count > 0
    ORDER BY title
    LIMIT 40
  `);

  console.log(`\n--- DUPLICATE ITEMS SAMPLE (${dupRes.rows.length}/${69}) ---`);
  dupRes.rows.forEach(r => {
    console.log(`ID:${r.id} | dupCount:${r.duplicate_count} | title:"${r.title}" | sig:${r.sig} | path:${r.source_path}`);
  });

  process.exit(0);
}

analyze().catch(console.error);
