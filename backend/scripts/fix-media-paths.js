#!/usr/bin/env node
/**
 * fix-media-paths.js
 * 
 * Update all media paths in database when disk mount points change.
 * 
 * Usage:
 *   node backend/scripts/fix-media-paths.js --old-prefix=/var/www/html --new-prefix=/mnt/data/html
 *   node backend/scripts/fix-media-paths.js --old-prefix=/var/www/html --new-prefix=/mnt/data/html --dry
 * 
 * This script updates:
 *   1. scanner_roots.scan_path
 *   2. content_catalog.payload->>'sourcePath'
 *   3. content_catalog.payload->>'videoUrl' (if prefix matches)
 *   4. content_catalog.payload->>'sourcePublicPath' (if prefix matches)
 *   5. Nested season/episode sourcePath in JSONB
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { dry: false };
  for (const arg of args) {
    if (arg === '--dry') result.dry = true;
    else if (arg.startsWith('--old-prefix=')) result.oldPrefix = arg.split('=')[1];
    else if (arg.startsWith('--new-prefix=')) result.newPrefix = arg.split('=')[1];
  }
  return result;
}

async function main() {
  const { oldPrefix, newPrefix, dry } = parseArgs();

  if (!oldPrefix || !newPrefix) {
    console.error('Usage: node fix-media-paths.js --old-prefix=<OLD_PATH> --new-prefix=<NEW_PATH> [--dry]');
    console.error('');
    console.error('Examples:');
    console.error('  node fix-media-paths.js --old-prefix=/var/www/html --new-prefix=/mnt/data/html --dry');
    console.error('  node fix-media-paths.js --old-prefix=/var/www/html --new-prefix=/mnt/data/html');
    process.exit(1);
  }

  console.log(`\n${dry ? '[DRY RUN] ' : ''}Media Path Fix`);
  console.log(`  Old prefix: ${oldPrefix}`);
  console.log(`  New prefix: ${newPrefix}\n`);

  const client = await pool.connect();
  let updatedRoots = 0;
  let updatedItems = 0;

  try {
    await client.query('BEGIN');

    // 1. Update scanner_roots.scan_path
    console.log('1. Updating scanner_roots.scan_path...');
    const rootsResult = await client.query(
      `UPDATE scanner_roots SET scan_path = REPLACE(scan_path, $1, $2), updated_at = NOW()
       WHERE scan_path LIKE $3 RETURNING id, label, scan_path`,
      [oldPrefix, newPrefix, `${oldPrefix}%`]
    );
    updatedRoots = rootsResult.rowCount;
    for (const row of rootsResult.rows) {
      console.log(`   Updated root "${row.label}" (${row.id}): ${row.scan_path}`);
    }

    // 2. Update content_catalog top-level sourcePath
    console.log('\n2. Updating content_catalog top-level sourcePath...');
    const sourcePathResult = await client.query(
      `UPDATE content_catalog
       SET payload = jsonb_set(payload, '{sourcePath}',
             to_jsonb(REPLACE(payload->>'sourcePath', $1, $2))),
           updated_at = NOW()
       WHERE payload->>'sourcePath' LIKE $3 RETURNING id, payload->>'title' AS title`,
      [oldPrefix, newPrefix, `${oldPrefix}%`]
    );
    updatedItems += sourcePathResult.rowCount;
    console.log(`   Updated ${sourcePathResult.rowCount} items (sourcePath)`);

    // 3. Update videoUrl (if it starts with old prefix path component)
    console.log('\n3. Updating videoUrl...');
    // videoUrl typically doesn't have the full filesystem prefix, but let's check
    const videoUrlResult = await client.query(
      `UPDATE content_catalog
       SET payload = jsonb_set(payload, '{videoUrl}',
             to_jsonb(REPLACE(payload->>'videoUrl', $1, $2))),
           updated_at = NOW()
       WHERE payload->>'videoUrl' LIKE $3 RETURNING id`,
      [oldPrefix, newPrefix, `${oldPrefix}%`]
    );
    updatedItems += videoUrlResult.rowCount;
    console.log(`   Updated ${videoUrlResult.rowCount} items (videoUrl)`);

    // 4. Update sourcePublicPath
    console.log('\n4. Updating sourcePublicPath...');
    const publicPathResult = await client.query(
      `UPDATE content_catalog
       SET payload = jsonb_set(payload, '{sourcePublicPath}',
             to_jsonb(REPLACE(payload->>'sourcePublicPath', $1, $2))),
           updated_at = NOW()
       WHERE payload->>'sourcePublicPath' LIKE $3 RETURNING id`,
      [oldPrefix, newPrefix, `${oldPrefix}%`]
    );
    updatedItems += publicPathResult.rowCount;
    console.log(`   Updated ${publicPathResult.rowCount} items (sourcePublicPath)`);

    // 5. Update nested season/episode sourcePath in JSONB
    console.log('\n5. Updating nested season/episode sourcePath...');
    // This requires a more complex JSONB manipulation
    const seriesResult = await client.query(
      `SELECT id, payload FROM content_catalog
       WHERE content_type = 'series'
       AND payload::text LIKE $1`,
      [`%${oldPrefix}%`]
    );
    
    let seriesUpdated = 0;
    for (const row of seriesResult.rows) {
      const payload = { ...row.payload };
      if (Array.isArray(payload.seasons)) {
        let changed = false;
        payload.seasons = payload.seasons.map(season => {
          const updatedSeason = { ...season };
          if (updatedSeason.sourcePath && updatedSeason.sourcePath.includes(oldPrefix)) {
            updatedSeason.sourcePath = updatedSeason.sourcePath.replace(oldPrefix, newPrefix);
            changed = true;
          }
          if (Array.isArray(updatedSeason.episodes)) {
            updatedSeason.episodes = updatedSeason.episodes.map(ep => {
              const updatedEp = { ...ep };
              if (updatedEp.sourcePath && updatedEp.sourcePath.includes(oldPrefix)) {
                updatedEp.sourcePath = updatedEp.sourcePath.replace(oldPrefix, newPrefix);
                changed = true;
              }
              if (updatedEp.videoUrl && updatedEp.videoUrl.includes(oldPrefix)) {
                updatedEp.videoUrl = updatedEp.videoUrl.replace(oldPrefix, newPrefix);
                changed = true;
              }
              return updatedEp;
            });
          }
          return updatedSeason;
        });
        
        if (changed) {
          if (!dry) {
            await client.query(
              'UPDATE content_catalog SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2',
              [JSON.stringify(payload), row.id]
            );
          }
          seriesUpdated++;
        }
      }
    }
    updatedItems += seriesUpdated;
    console.log(`   Updated ${seriesUpdated} series with nested episode paths`);

    if (dry) {
      console.log('\n[DRY RUN] No changes committed. Run without --dry to apply.');
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
      console.log(`\n✅ Done! Updated ${updatedRoots} roots and ~${updatedItems} content entries.`);
      console.log('\nNext steps:');
      console.log('  1. Restart the backend server');
      console.log('  2. Re-run scanner: POST /api/admin/scanner/run');
      console.log('  3. Test media playback');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
