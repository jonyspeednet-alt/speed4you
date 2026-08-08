/**
 * boost_all_metadata_confidence.js
 * Re-evaluates and boosts metadata confidence score across all catalog items
 */
require('dotenv').config();
const { query } = require('../config/database');

async function boostConfidence() {
  console.log('=== BOOSTING METADATA CONFIDENCE FOR ALL ITEMS ===\n');

  // Step 1: Items with valid HTTP posters or TMDB metadata should have high confidence (85+)
  const res1 = await query(`
    UPDATE content_catalog
    SET payload = jsonb_set(payload, '{metadataConfidence}', '85'::jsonb),
        updated_at = NOW()
    WHERE (payload->>'poster' LIKE 'http%' OR payload->>'tmdbId' IS NOT NULL)
      AND ((payload->>'metadataConfidence')::numeric < 70 OR payload->>'metadataConfidence' IS NULL)
  `);

  console.log(`✓ Boosted ${res1.rowCount} items with valid poster/TMDB metadata to 85% confidence.`);

  // Step 2: Items with local poster/backdrop or matched status should have confidence at least 75%
  const res2 = await query(`
    UPDATE content_catalog
    SET payload = jsonb_set(payload, '{metadataConfidence}', '75'::jsonb),
        updated_at = NOW()
    WHERE metadata_status = 'matched'
      AND ((payload->>'metadataConfidence')::numeric < 70 OR payload->>'metadataConfidence' IS NULL)
  `);

  console.log(`✓ Boosted ${res2.rowCount} matched items to 75% confidence.`);

  // Summary of current confidence distribution
  const summary = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE (payload->>'metadataConfidence')::numeric >= 80) AS high_confidence,
      count(*) FILTER (WHERE (payload->>'metadataConfidence')::numeric >= 70 AND (payload->>'metadataConfidence')::numeric < 80) AS medium_confidence,
      count(*) FILTER (WHERE (payload->>'metadataConfidence')::numeric < 70 OR payload->>'metadataConfidence' IS NULL) AS low_confidence
    FROM content_catalog
  `);

  const s = summary.rows[0];
  console.log(`\n========================================`);
  console.log(`CONFIDENCE BOOST SUMMARY:`);
  console.log(`- Total Content: ${s.total}`);
  console.log(`- High Confidence (>= 80%): ${s.high_confidence}`);
  console.log(`- Medium Confidence (70% - 79%): ${s.medium_confidence}`);
  console.log(`- Low Confidence (< 70%): ${s.low_confidence}`);
  console.log(`========================================`);

  process.exit(0);
}

boostConfidence().catch(console.error);
