/**
 * fix_tv_ns_complete.js
 * Scans 6 missing disk folders and fixes TMDB metadata for Shogun & State of Siege 2611,
 * ensuring 100% publication for TV_Web_Series-N-S
 */
require('dotenv').config();
const { query } = require('../config/database');
const { fetchMetadataByTmdbId } = require('../services/metadata-enricher');
const fs = require('fs');
const path = require('path');

async function fixNS() {
  const rootDir = '/var/www/html/TV_Series/TV_Web_Series-N-S';
  console.log(`=== FIXING TV_Web_Series-N-S TO 100% COMPLETE ===\n`);

  // 1. Explicit TMDB ID Mappings for the 6 missing disk folders + 2 unmatched items
  const fixes = [
    // 6 Folders missing from DB
    { title: "Naruto Shippuden", folder: "Naruto Shippuden", tmdbId: 31910 },
    { title: "Parasyte -the maxim-", folder: "Parasyte: The Maxim", tmdbId: 61459 },
    { title: "Planet Earth", folder: "Planet Earth", tmdbId: 1018 },
    { title: "Rahasya Romancha Series", folder: "Rahasya Romancha Series [Bangla]", tmdbId: 92769 },
    { title: "Six", folder: "Six [Bangla]", tmdbId: 133501 },
    { title: "Super Dragon Ball Heroes", folder: "Super Dragon Ball Heroes", tmdbId: 80468 },

    // 2 Unmatched items in DB
    { id: 34223, title: "Shōgun", tmdbId: 126308 },
    { id: 31705, title: "State of Siege: 26/11", tmdbId: 100868 }
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
            sourceRootId: 'series-n-s',
            scanSignature: `series-n-s:${f.folder}`,
            sourcePath: fullPath,
            sourcePublicPath: `/TV_Series/TV_Web_Series-N-S/${f.folder}`,
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
          `, [nextId, JSON.stringify(newItem), now, now, 'published', 'series', newItem.title, newItem.title.toLowerCase(), 'scanner', 'series-n-s', 'matched', now]);

          console.log(`  ✓ Created & Published missing folder ID:${nextId} "${newItem.title}"`);
        }
      }
    } catch (err) {
      console.log(`  ✗ Error processing "${f.title}": ${err.message}`);
    }
  }

  // Force published for 100% of rows under TV_Web_Series-N-S
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

fixNS().catch(console.error);
