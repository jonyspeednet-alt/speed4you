/**
 * cleanup-stale-published.js
 *
 * Removes stale published entries whose sourcePath doesn't exist on disk
 * and whose scanSignature is not in the current scan set.
 *
 * Usage:
 *   node backend/scripts/cleanup-stale-published.js --dry-run    # Preview only
 *   node backend/scripts/cleanup-stale-published.js              # Actually delete
 *   node backend/scripts/cleanup-stale-published.js --verbose    # Show details
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
});

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN MODE - no changes will be made ===\n');
  }

  // Get all published scanner entries
  const result = await pool.query(
    `SELECT id, title, title_key, payload, content_type, year
     FROM content_catalog
     WHERE source_type = 'scanner'
       AND status = 'published'
     ORDER BY id ASC`
  );

  console.log(`Found ${result.rows.length} published scanner entries.\n`);

  let deleted = 0;
  let skipped = 0;
  let kept = 0;

  for (const row of result.rows) {
    const p = row.payload;
    if (!p || !p.sourcePath) {
      skipped++;
      if (VERBOSE) console.log(`  ID=${row.id} "${row.title}" - no sourcePath, skipping`);
      continue;
    }

    // Check if sourcePath exists on disk
    const pathExists = await fs.promises.access(p.sourcePath).then(() => true).catch(() => false);
    if (pathExists) {
      kept++;
      if (VERBOSE) console.log(`  ID=${row.id} "${row.title}" - file exists, keeping`);
      continue;
    }

    // File doesn't exist - check if there's a newer entry with same titleKey
    const titleKey = row.title_key || p.title_key || '';
    if (!titleKey) {
      skipped++;
      if (VERBOSE) console.log(`  ID=${row.id} "${row.title}" - no titleKey, skipping`);
      continue;
    }

    const newerEntry = await pool.query(
      `SELECT id, title FROM content_catalog
       WHERE content_type = $1
         AND title_key = $2
         AND source_type = 'scanner'
         AND id <> $3
         AND status = 'published'`,
      [row.content_type || 'movie', titleKey, row.id]
    );

    if (newerEntry.rows.length > 0) {
      if (VERBOSE) {
        console.log(`  ID=${row.id} "${row.title}" - STALE (newer ID=${newerEntry.rows[0].id} "${newerEntry.rows[0].title}" exists)`);
      }
      if (!DRY_RUN) {
        await pool.query('DELETE FROM content_catalog WHERE id = $1', [row.id]);
      }
      console.log(`  -> ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} ID=${row.id} "${row.title}" (file missing, newer entry exists)`);
      deleted++;
    } else {
      kept++;
      if (VERBOSE) console.log(`  ID=${row.id} "${row.title}" - file missing but no newer entry, keeping`);
    }
  }

  console.log(`\nDone! Deleted: ${deleted}, Kept: ${kept}, Skipped: ${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
