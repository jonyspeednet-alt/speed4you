/**
 * reenrich_missing_posters.js
 * Runs metadata enrichment on all catalog items currently missing posters
 */
require('dotenv').config();
const { query } = require('../config/database');
const { enrichItemWithMetadata } = require('../services/metadata-enricher');

async function reenrichMissingPosters() {
  console.log('=== RE-ENRICHING ALL ITEMS MISSING POSTERS ===\n');

  const missingRes = await query(`
    SELECT id, payload
    FROM content_catalog
    WHERE payload->>'poster' IS NULL
       OR payload->>'poster' = ''
       OR payload->>'poster' = 'null'
  `);

  const total = missingRes.rows.length;
  console.log(`Found ${total} items missing posters. Starting enrichment...\n`);

  let fetchedPosters = 0;
  for (let i = 0; i < missingRes.rows.length; i++) {
    const row = missingRes.rows[i];
    const item = row.payload;

    try {
      const enriched = await enrichItemWithMetadata(item);
      const now = new Date().toISOString();

      if (Boolean(enriched.poster && enriched.poster.startsWith('http'))) {
        fetchedPosters++;
        console.log(`  ✓ [${i + 1}/${total}] ID:${row.id} "${item.title}" -> Poster Found: ${enriched.poster}`);
      } else {
        console.log(`  ✗ [${i + 1}/${total}] ID:${row.id} "${item.title}" -> No poster found`);
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
    } catch (err) {
      console.error(`  Error processing ID ${row.id}: ${err.message}`);
    }
  }

  // Summary
  const summaryRes = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE payload->>'poster' LIKE 'http%') AS with_poster,
      count(*) FILTER (WHERE payload->>'poster' IS NULL OR payload->>'poster' = '' OR payload->>'poster' = 'null') AS missing_poster
    FROM content_catalog
  `);

  const s = summaryRes.rows[0];
  console.log(`\n========================================`);
  console.log(`POSTER ENRICHMENT SUMMARY:`);
  console.log(`- Newly Fetched Posters: ${fetchedPosters}`);
  console.log(`- Total Catalog Items: ${s.total}`);
  console.log(`- Items with Valid Poster: ${s.with_poster} (${Math.round((s.with_poster / s.total) * 100)}%)`);
  console.log(`- Items Missing Poster: ${s.missing_poster}`);
  console.log(`========================================`);

  process.exit(0);
}

reenrichMissingPosters().catch(console.error);
