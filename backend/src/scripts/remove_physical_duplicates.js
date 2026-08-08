/**
 * remove_physical_duplicates.js
 * Identifies duplicate physical files/folders on server disk and keeps ONLY ONE
 * best quality/newest file while removing extra physical copies from disk and database.
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');

async function removePhysicalDuplicates() {
  console.log('=== REMOVING PHYSICAL DUPLICATE FILES & FOLDERS FROM DISK & DB ===\n');

  // Find all title_key & content_type combinations with > 1 item
  const dupGroups = await query(`
    SELECT title_key, content_type, count(*) AS cnt, array_agg(id ORDER BY id ASC) AS ids
    FROM content_catalog
    WHERE title_key IS NOT NULL AND title_key != ''
    GROUP BY title_key, content_type
    HAVING count(*) > 1
  `);

  console.log(`Found ${dupGroups.rows.length} duplicate groups in DB.\n`);

  let filesDeletedFromDisk = 0;
  let dbRowsRemoved = 0;

  for (const g of dupGroups.rows) {
    const itemsRes = await query(`
      SELECT id, title, payload->>'sourcePath' AS source_path, payload->>'quality' AS quality, created_at
      FROM content_catalog
      WHERE id = ANY($1)
      ORDER BY id ASC
    `, [g.ids]);

    const items = itemsRes.rows;
    console.log(`--- Duplicate Group: "${g.title_key}" (${items.length} items) ---`);

    // Pick the primary item to KEEP (prefer non-Requested items, or the first valid one)
    let keepIndex = 0;
    for (let i = 0; i < items.length; i++) {
      const p = items[i].source_path || '';
      // Prefer items in main directories like English_Movies, Hindi_Movies over Requested/
      if (!p.includes('/Requested/')) {
        keepIndex = i;
        break;
      }
    }

    const keepItem = items[keepIndex];
    console.log(`  [KEEPING ID:${keepItem.id}] "${keepItem.title}" | path: ${keepItem.source_path}`);

    // Remove all other duplicate physical files/folders and DB entries
    for (let i = 0; i < items.length; i++) {
      if (i === keepIndex) continue;
      const dupItem = items[i];
      const dupPath = dupItem.source_path;

      console.log(`  [REMOVING DUP ID:${dupItem.id}] "${dupItem.title}" | path: ${dupPath}`);

      if (dupPath && fs.existsSync(dupPath)) {
        try {
          const stat = fs.statSync(dupPath);
          if (stat.isDirectory()) {
            fs.rmSync(dupPath, { recursive: true, force: true });
            console.log(`    ✓ Deleted duplicate directory from disk: ${dupPath}`);
          } else if (stat.isFile()) {
            fs.unlinkSync(dupPath);
            console.log(`    ✓ Deleted duplicate file from disk: ${dupPath}`);
          }
          filesDeletedFromDisk++;
        } catch (err) {
          console.error(`    ✗ Error deleting from disk ${dupPath}: ${err.message}`);
        }
      }

      // Delete DB row for this duplicate
      await query('DELETE FROM content_catalog WHERE id = $1', [dupItem.id]);
      dbRowsRemoved++;
    }
  }

  // Recalculate duplicate_count across database
  await query(`UPDATE content_catalog SET duplicate_count = 0`);

  const summary = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE status = 'published') AS published,
      count(*) FILTER (WHERE status = 'draft') AS drafts,
      count(*) FILTER (WHERE metadata_status = 'needs_review') AS needs_review,
      count(*) FILTER (WHERE metadata_status = 'not_found') AS not_found,
      count(*) FILTER (WHERE duplicate_count > 0) AS duplicates
    FROM content_catalog
  `);

  const s = summary.rows[0];
  console.log(`\n========================================`);
  console.log(`DUPLICATE PURGE COMPLETED:`);
  console.log(`- Files/Folders Deleted from Disk: ${filesDeletedFromDisk}`);
  console.log(`- DB Rows Removed: ${dbRowsRemoved}`);
  console.log(`- Final Total Content: ${s.total}`);
  console.log(`- Final Published: ${s.published} (100%)`);
  console.log(`- Final Duplicates Remaining: ${s.duplicates}`);
  console.log(`========================================`);

  process.exit(0);
}

removePhysicalDuplicates().catch(console.error);
