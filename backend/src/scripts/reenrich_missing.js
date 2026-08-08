/**
 * reenrich_missing.js
 * 
 * Re-runs metadata enrichment on items that:
 * 1. Are published but missing poster/backdrop/description
 * 2. Are draft/not_found to test new noise patterns and native search
 */
require('dotenv').config();
const { query } = require('../config/database');
const { enrichItemWithMetadata } = require('../services/metadata-enricher');

async function reenrich() {
  console.log('=== RE-ENRICHING ITEMS WITH MISSING METADATA ===\n');

  // 1. Fetch published items missing poster/backdrop/description
  const missingRes = await query(`
    SELECT id, payload
    FROM content_catalog
    WHERE status = 'published'
      AND (
        payload->>'poster' IS NULL OR payload->>'poster' = ''
        OR payload->>'backdrop' IS NULL OR payload->>'backdrop' = ''
        OR payload->>'description' IS NULL OR payload->>'description' = ''
      )
    LIMIT 30
  `);

  console.log(`Found ${missingRes.rows.length} published items needing metadata re-enrichment...\n`);

  let updatedCount = 0;
  for (const row of missingRes.rows) {
    const item = row.payload;
    console.log(`Processing ID:${row.id} "${item.title}"...`);
    try {
      const enriched = await enrichItemWithMetadata(item);
      const now = new Date().toISOString();
      await query(`
        UPDATE content_catalog
        SET payload = $2::jsonb,
            updated_at = $3,
            metadata_status = $4
        WHERE id = $1
      `, [row.id, JSON.stringify(enriched), now, enriched.metadataStatus]);
      
      console.log(`  -> Result: status=${enriched.metadataStatus}, poster=${Boolean(enriched.poster)}, backdrop=${Boolean(enriched.backdrop)}`);
      if (enriched.poster) updatedCount++;
    } catch (err) {
      console.error(`  -> Failed: ${err.message}`);
    }
  }

  console.log(`\nPublished items updated with poster/backdrop: ${updatedCount}/${missingRes.rows.length}`);

  // 2. Test draft not_found items with new trailing-p / native search fixes
  const draftRes = await query(`
    SELECT id, payload
    FROM content_catalog
    WHERE status = 'draft' AND metadata_status = 'not_found'
    ORDER BY id DESC
    LIMIT 25
  `);

  console.log(`\nRe-enriching ${draftRes.rows.length} draft not_found items...`);
  let draftFixed = 0;
  for (const row of draftRes.rows) {
    const item = row.payload;
    try {
      const enriched = await enrichItemWithMetadata(item);
      if (enriched.metadataStatus === 'matched') {
        draftFixed++;
        const now = new Date().toISOString();
        // Auto-publish matched items per new rules
        enriched.status = 'published';
        enriched.publishedAt = item.publishedAt || now;

        await query(`
          UPDATE content_catalog
          SET status = 'published',
              metadata_status = 'matched',
              payload = $2::jsonb,
              updated_at = $3
          WHERE id = $1
        `, [row.id, JSON.stringify(enriched), now]);
        console.log(`  ✓ ID:${row.id} "${item.title}" -> MATCHED & PUBLISHED! (poster: ${Boolean(enriched.poster)})`);
      } else {
        console.log(`  ✗ ID:${row.id} "${item.title}" -> still ${enriched.metadataStatus}`);
      }
    } catch (err) {
      console.error(`  -> Error: ${err.message}`);
    }
  }

  console.log(`\nDraft items successfully matched & published: ${draftFixed}/${draftRes.rows.length}`);
  process.exit(0);
}

reenrich().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
