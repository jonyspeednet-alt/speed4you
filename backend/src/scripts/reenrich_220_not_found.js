/**
 * reenrich_220_not_found.js
 * Re-runs cleanSearchTitle with NFC Unicode normalization and fetches posters for not_found items
 */
require('dotenv').config();
const { query } = require('../config/database');
const { cleanSearchTitle, enrichItemWithMetadata } = require('../services/metadata-enricher');

async function reenrichNotFound() {
  console.log('=== RE-ENRICHING 220 NOT_FOUND ITEMS WITH UNICODE NFC FIX ===\n');

  const res = await query(`
    SELECT id, payload
    FROM content_catalog
    WHERE metadata_status = 'not_found'
    LIMIT 50
  `);

  console.log(`Processing batch of ${res.rows.length} not_found items...\n`);

  let fixedCount = 0;
  for (const row of res.rows) {
    const item = row.payload;
    const oldTitle = item.title;
    const clean = cleanSearchTitle(oldTitle);
    
    try {
      const enriched = await enrichItemWithMetadata(item);
      const now = new Date().toISOString();

      if (enriched.metadataStatus === 'matched' || Boolean(enriched.poster)) {
        fixedCount++;
        console.log(`  ✓ ID:${row.id} "${oldTitle}" -> Clean: "${clean}" -> MATCHED (Poster: ${Boolean(enriched.poster)})`);
      } else {
        console.log(`  ✗ ID:${row.id} "${oldTitle}" -> Clean: "${clean}" -> still ${enriched.metadataStatus}`);
      }

      await query(`
        UPDATE content_catalog
        SET payload = $2::jsonb,
            title = $3,
            title_key = $4,
            updated_at = $5,
            metadata_status = $6
        WHERE id = $1
      `, [row.id, JSON.stringify(enriched), enriched.title, (enriched.title || '').toLowerCase(), now, enriched.metadataStatus]);
    } catch (e) {
      console.log(`  Error ID ${row.id}: ${e.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Batch re-enrichment fixed: ${fixedCount}/${res.rows.length} items.`);
  console.log(`========================================`);

  process.exit(0);
}

reenrichNotFound().catch(console.error);
