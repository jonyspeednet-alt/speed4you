/**
 * fix_tv_t_complete.js
 * Scans 3 missing disk folders and fixes TMDB metadata for unmatched items in TV_Web_Series-T
 */
require('dotenv').config();
const { query } = require('../config/database');
const { fetchMetadataByTmdbId } = require('../services/metadata-enricher');
const fs = require('fs');
const path = require('path');

async function fixT() {
  const rootDir = '/var/www/html/TV_Series/TV_Web_Series-T';
  console.log(`=== FIXING TV_Web_Series-T TO 100% COMPLETE ===\n`);

  const fixes = [
    // 3 Folders missing from DB
    { title: "Tale of the Nine Tailed", folder: "Tale of the Nine-Tailed", tmdbId: 108304 },
    { title: "The Witcher", folder: "The Witcher", tmdbId: 71912 },
    { title: "Tokyo Ghoul", folder: "Tokyo Ghoul", tmdbId: 61415 },

    // Unmatched / Poorly matched items in DB
    { id: 34346, title: "Tale of the Nine Tailed", tmdbId: 108304 },
    { id: 34351, title: "The Bards of Bollywood", tmdbId: 288340 },
    { id: 34353, title: "The Chargesheet: Innocent or Guilty?", tmdbId: 96919 },
    { id: 32627, title: "The Sopranos", tmdbId: 1398 },
    { id: 34367, title: "Tokyo Ghoul:re", tmdbId: 77803 },
    { id: 32667, title: "Tomake Bujhina Priyo", tmdbId: 130802 }
  ];

  for (const f of fixes) {
    try {
      console.log(`Processing "${f.title}" (TMDB ID: ${f.tmdbId})...`);
      const meta = await fetchMetadataByTmdbId(f.tmdbId, 'tv');
      const now = new Date().toISOString();

      if (f.id) {
        // Update existing row
        const existing = await query('SELECT payload FROM content_catalog WHERE id = $1', [f.id]);
        if (existing.rows.length) {
          const item = existing.rows[0].payload;
          const updatedItem = {
            ...item,
            ...meta,
            title: meta.title || item.title,
            status: 'published',
            metadataStatus: 'matched',
            metadataConfidence: 100,
            metadataUpdatedAt: now
          };

          await query(`
            UPDATE content_catalog
            SET payload = $2::jsonb,
                title = $3,
                status = 'published',
                updated_at = $4,
                metadata_status = 'matched'
            WHERE id = $1
          `, [f.id, JSON.stringify(updatedItem), updatedItem.title, now]);
          console.log(`  ✓ Updated existing ID:${f.id} "${updatedItem.title}"`);
        }
      } else {
        // Create new item for missing disk folder
        const fullPath = path.join(rootDir, f.folder);
        if (fs.existsSync(fullPath)) {
          const nextId = await require('../data/store/content').allocateNextCatalogId();
          const newItem = {
            id: nextId,
            title: meta.title || f.title,
            content_type: 'series',
            type: 'series',
            status: 'published',
            publishedAt: now,
            createdAt: now,
            updatedAt: now,
            sourceType: 'scanner',
            sourceRootId: 'series-t',
            scanSignature: `series-t:${f.folder}`,
            sourcePath: fullPath,
            sourcePublicPath: `/TV_Series/TV_Web_Series-T/${f.folder}`,
            ...meta,
            metadataStatus: 'matched',
            metadataConfidence: 100,
            metadataUpdatedAt: now
          };

          await query(`
            INSERT INTO content_catalog
              (id, payload, created_at, updated_at, status, content_type, title, title_key, source_type, source_root_id, metadata_status, published_at)
            VALUES
              ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [nextId, JSON.stringify(newItem), now, now, 'published', 'series', newItem.title, newItem.title.toLowerCase(), 'scanner', 'series-t', 'matched', now]);

          console.log(`  ✓ Created & Published missing folder ID:${nextId} "${newItem.title}"`);
        }
      }
    } catch (err) {
      console.log(`  ✗ Error processing "${f.title}": ${err.message}`);
    }
  }

  // Force 100% published for all rows under TV_Web_Series-T
  await query(`
    UPDATE content_catalog
    SET status = 'published',
        published_at = COALESCE(published_at, NOW()),
        updated_at = NOW(),
        payload = jsonb_set(
          jsonb_set(payload, '{status}', '"published"'),
          '{publishedAt}', to_jsonb(COALESCE(published_at, NOW()))
        )
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
  `, [`%${rootDir}%`]);

  console.log(`\n✓ Set 100% Published for all items in ${rootDir}`);
  process.exit(0);
}

fixT().catch(console.error);
