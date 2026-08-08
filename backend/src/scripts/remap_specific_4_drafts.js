/**
 * remap_specific_4_drafts.js
 * Explicitly fetches and maps correct TMDB IDs for the 4 draft items
 */
require('dotenv').config();
const { query } = require('../config/database');
const { fetchMetadataByTmdbId } = require('../services/metadata-enricher');

async function fixFourDrafts() {
  console.log('=== REMAPPING 4 DRAFT SERIES ===\n');

  // Mapping known TMDB IDs for these titles
  const manualMappings = [
    { id: 33996, title: 'Batman Caped Crusader 2026', tmdbId: 125909, type: 'series' }, // Batman: Caped Crusader (2024)
    { id: 34034, title: "Widows Bay", tmdbId: 279589, type: 'series' }, // Widow's Bay (2026)
    { id: 33992, title: "13th Some Lessons Arent Taught In Classrooms", tmdbId: 297782, type: 'series' }, // 13th: Some Lessons Aren't Taught...
    { id: 34023, title: "Search The Naina Murder Case", tmdbId: 288339, type: 'series' }, // Search: The Naina Murder Case
  ];

  for (const map of manualMappings) {
    console.log(`Processing ID:${map.id} "${map.title}" -> Fetching TMDB ID ${map.tmdbId}...`);
    try {
      // 1. Fetch from TMDB directly
      const meta = await fetchMetadataByTmdbId(map.tmdbId, 'tv');
      
      // 2. Fetch existing row from DB
      const existing = await query('SELECT payload FROM content_catalog WHERE id = $1', [map.id]);
      if (!existing.rows.length) {
        console.log(`  ⚠ ID ${map.id} not found in DB.`);
        continue;
      }

      const item = existing.rows[0].payload;
      const now = new Date().toISOString();

      const updatedItem = {
        ...item,
        ...meta,
        title: meta.title || item.title,
        status: 'published',
        publishedAt: item.publishedAt || now,
        metadataStatus: 'matched',
        metadataConfidence: 100,
        metadataUpdatedAt: now
      };

      await query(`
        UPDATE content_catalog
        SET status = 'published',
            metadata_status = 'matched',
            payload = $2::jsonb,
            updated_at = $3
        WHERE id = $1
      `, [map.id, JSON.stringify(updatedItem), now]);

      console.log(`  ✓ Successfully updated & published ID:${map.id} "${updatedItem.title}"!`);
    } catch (err) {
      console.log(`  ✗ Failed TMDB direct fetch for ID ${map.id}: ${err.message}`);
    }
  }

  // Verification check
  const finalCheck = await query(`
    SELECT id, title, status, metadata_status, payload->>'poster' AS poster
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE '%/Requested/Series/%'
    ORDER BY status, title
  `);

  const pub = finalCheck.rows.filter(r => r.status === 'published');
  const drf = finalCheck.rows.filter(r => r.status === 'draft');

  console.log(`\n========================================`);
  console.log(`FINAL RESULT FOR /Requested/Series/:`);
  console.log(`Total items in DB: ${finalCheck.rows.length}/44`);
  console.log(`- PUBLISHED: ${pub.length}`);
  console.log(`- DRAFT: ${drf.length}`);
  console.log(`========================================`);

  process.exit(0);
}

fixFourDrafts().catch(console.error);
