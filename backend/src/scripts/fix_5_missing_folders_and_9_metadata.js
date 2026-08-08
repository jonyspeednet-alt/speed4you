/**
 * fix_5_missing_folders_and_9_metadata.js
 * Scans the 5 missing disk folders and fixes TMDB metadata for the 9 unmatched items
 */
require('dotenv').config();
const { query } = require('../config/database');
const { fetchMetadataByTmdbId } = require('../services/metadata-enricher');

async function fixAllRemaining() {
  console.log('=== FIXING 5 MISSING DISK FOLDERS & 9 UNMATCHED METADATA ===\n');

  // 1. Explicit TMDB Mappings for the 9 unmatched items + 5 missing folders
  const fixes = [
    // 5 Folders missing from DB
    { title: "50 States of Fright", folder: "50 States of Fright", tmdbId: 100742 },
    { title: "Criminal Justice", folder: "Criminal Justice", tmdbId: 88849 },
    { title: "Daldal", folder: "Daldal", tmdbId: 260310 },
    { title: "Doctor Stranger", folder: "Doctor Stranger [Dakteo Yibangin (original title)]", tmdbId: 60803 },
    { title: "Dragon Ball Z", folder: "Dragon Ball Z", tmdbId: 12971 },

    // 9 Items in DB but metadata not found
    { id: 34218, title: "Crisis on Infinite Earths", tmdbId: 96660 }, // Arrowverse crossover
    { id: 34220, title: "Dragon Ball Z Movies", tmdbId: 12971 },
    { id: 34217, title: "Crisis on Earth X", tmdbId: 74906 },
    { id: 34219, title: "Diriliş: Ertuğrul", tmdbId: 66025 },
    { id: 34202, title: "3Below: Tales of Arcadia", tmdbId: 84381 },
    { id: 34200, title: "1983", tmdbId: 84394 },
    { id: 34210, title: "Ben 10", tmdbId: 2129 },
    { id: 34212, title: "Boli", tmdbId: 139191 },
    { id: 34216, title: "Cholo Digonte", tmdbId: 241086 }
  ];

  const rootDir = '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E';
  const fs = require('fs');
  const path = require('path');

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
            sourceRootId: 'tv-series-a-e',
            scanSignature: `tv-series-a-e:${f.folder}`,
            sourcePath: fullPath,
            sourcePublicPath: `/TV_Series/TV_Web_Series-0-9_A-E/${f.folder}`,
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
          `, [nextId, JSON.stringify(newItem), now, now, 'published', 'series', newItem.title, newItem.title.toLowerCase(), 'scanner', 'tv-series-a-e', 'matched', now]);

          console.log(`  ✓ Created & Published new folder ID:${nextId} "${newItem.title}"`);
        }
      }
    } catch (err) {
      console.log(`  ✗ Error processing "${f.title}": ${err.message}`);
    }
  }

  process.exit(0);
}

fixAllRemaining().catch(console.error);
