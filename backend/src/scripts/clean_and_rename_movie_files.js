/**
 * clean_and_rename_movie_files.js
 * Scans /var/www/html/Requested/Movies/ for filenames ending with trailing 'p'
 * (e.g., MovieNamep.mkv) and renames the actual physical files on disk to clean names
 * (e.g., MovieName.mkv), then updates sourcePath in DB and re-enriches metadata.
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { cleanSearchTitle, enrichItemWithMetadata } = require('../services/metadata-enricher');

async function cleanAndRename() {
  console.log('=== CLEANING & RENAMING MOVIE FILES ON DISK ===\n');

  const rootPath = '/var/www/html/Requested/Movies';
  const files = fs.readdirSync(rootPath, { withFileTypes: true });

  let renamedCount = 0;
  let dbUpdatedCount = 0;

  for (const file of files) {
    if (file.isDirectory()) continue;
    const oldFileName = file.name;
    const ext = path.extname(oldFileName);
    const nameWithoutExt = path.basename(oldFileName, ext);

    // Check if filename ends with trailing 'p' from resolution leakage (e.g., "Turbulencep", "Patriotp")
    // but exclude legitimate words ending in 'p' or year/resolution tags like "720p"
    if (/\b([a-zA-Z]{3,})p$/i.test(nameWithoutExt) && !/\b\d+p$/i.test(nameWithoutExt)) {
      const realPWords = new Set([
        'stop','loop','drop','wrap','help','sleep','keep','step','deep','cheap',
        'pump','jump','dump','bump','hump','lump','ramp','camp','lamp','stamp',
        'hemp','temp','shop','crop','prop','drip','grip','trip','chip','ship',
        'clip','flip','snoop','swoop','troop','stoop','scalp','yelp','gulp','pulp'
      ]);

      const lastWord = nameWithoutExt.split(/\s+/).pop().toLowerCase();
      if (!realPWords.has(lastWord)) {
        // Construct clean filename
        const cleanBase = nameWithoutExt.slice(0, -1).trim(); // remove the trailing 'p'
        const newFileName = `${cleanBase}${ext}`;
        const oldFullPath = path.join(rootPath, oldFileName);
        const newFullPath = path.join(rootPath, newFileName);

        try {
          // 1. Rename physical file on disk
          if (fs.existsSync(oldFullPath) && !fs.existsSync(newFullPath)) {
            fs.renameSync(oldFullPath, newFullPath);
            renamedCount++;
            console.log(`[DISK RENAME] "${oldFileName}" -> "${newFileName}"`);

            // 2. Update sourcePath, title, and re-enrich in DB
            const dbMatch = await query(`
              SELECT id, payload FROM content_catalog
              WHERE payload->>'sourcePath' = $1
            `, [oldFullPath]);

            if (dbMatch.rows.length) {
              const item = dbMatch.rows[0].payload;
              const now = new Date().toISOString();

              const updatedPayload = {
                ...item,
                title: cleanBase,
                sourcePath: newFullPath,
                sourcePublicPath: item.sourcePublicPath ? item.sourcePublicPath.replace(oldFileName, newFileName) : ''
              };

              // Re-enrich metadata with clean title
              const enriched = await enrichItemWithMetadata(updatedPayload);

              await query(`
                UPDATE content_catalog
                SET payload = $2::jsonb,
                    title = $3,
                    updated_at = $4,
                    metadata_status = $5
                WHERE id = $1
              `, [dbMatch.rows[0].id, JSON.stringify(enriched), enriched.title, now, enriched.metadataStatus]);

              dbUpdatedCount++;
              console.log(`  ✓ [DB UPDATE] ID:${dbMatch.rows[0].id} title:"${enriched.title}" status:${enriched.metadataStatus} poster:${Boolean(enriched.poster)}`);
            }
          }
        } catch (err) {
          console.error(`  ✗ Error renaming "${oldFileName}": ${err.message}`);
        }
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`RENAME & RE-ENRICHMENT SUMMARY:`);
  console.log(`- Physical files renamed on disk: ${renamedCount}`);
  console.log(`- Database records updated & re-enriched: ${dbUpdatedCount}`);
  console.log(`========================================`);

  process.exit(0);
}

cleanAndRename().catch(console.error);
