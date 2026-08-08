/**
 * inspect_low_confidence_items.js
 * Inspects items with metadata_confidence < 70 in database
 */
require('dotenv').config();
const { query } = require('../config/database');

async function inspectLowConfidence() {
  console.log('=== INSPECTING LOW CONFIDENCE METADATA ITEMS ===\n');

  const res = await query(`
    SELECT count(*) FROM content_catalog
    WHERE (payload->>'metadataConfidence')::numeric < 70
       OR payload->>'metadataConfidence' IS NULL
  `);

  console.log(`Total items with metadataConfidence < 70: ${res.rows[0].count}`);

  const sample = await query(`
    SELECT id, title, content_type,
           payload->>'metadataConfidence' AS conf,
           payload->>'metadataProvider' AS provider,
           payload->>'poster' AS poster,
           payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE (payload->>'metadataConfidence')::numeric < 70
       OR payload->>'metadataConfidence' IS NULL
    LIMIT 30
  `);

  console.log('\n--- SAMPLE 30 LOW CONFIDENCE ITEMS ---');
  sample.rows.forEach(r => {
    console.log(`ID:${r.id} | conf:${r.conf} | provider:${r.provider} | title:"${r.title}" | poster:${Boolean(r.poster && r.poster.startsWith('http'))}`);
    console.log(`  path:${r.source_path}`);
  });

  process.exit(0);
}

inspectLowConfidence().catch(console.error);
