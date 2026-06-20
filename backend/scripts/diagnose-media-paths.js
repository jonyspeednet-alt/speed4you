#!/usr/bin/env node
/**
 * diagnose-media-paths.js
 * 
 * Server reboot/remount por media play hocche na - ei script diagnose korbe.
 * Run: node backend/scripts/diagnose-media-paths.js
 * 
 * This script checks:
 * 1. Current mount points and disk status
 * 2. Scanner roots stored in DB vs actual filesystem
 * 3. Content catalog sourcePath validity
 * 4. Broken/missing paths
 * 5. Suggested fixes
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
  max: 5,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 10000,
});

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

function header(title) {
  console.log('\n' + COLORS.bold + COLORS.cyan + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60) + COLORS.reset);
}

function subHeader(title) {
  console.log('\n' + COLORS.bold + '--- ' + title + ' ---' + COLORS.reset);
}

async function checkMountPoints() {
  header('1. DISK & MOUNT POINT STATUS');
  
  try {
    const lsblk = execSync('lsblk 2>/dev/null || echo "lsblk not available"', { encoding: 'utf8' });
    console.log(COLORS.dim + lsblk + COLORS.reset);
  } catch {
    log(COLORS.yellow, 'Could not run lsblk');
  }

  try {
    const dfOutput = execSync('df -h 2>/dev/null | grep -E "/var|/mnt|/media|/home|/extra" || echo "No relevant mounts found"', { encoding: 'utf8' });
    console.log(COLORS.dim + dfOutput + COLORS.reset);
  } catch {
    log(COLORS.yellow, 'Could not run df');
  }

  const checkPaths = [
    '/var/www/html',
    '/var/www/html/English_Movies',
    '/var/www/html/TV_Series',
    '/var/www/html/New_Movies_1',
    '/var/www/html/New_Movies_2',
    '/var/www/html/Extra_Storage',
    '/var/www/html/Extra_Storage/portal-media-cache',
  ];

  subHeader('Key Directory Check');
  for (const p of checkPaths) {
    const exists = fs.existsSync(p);
    const status = exists ? COLORS.green + 'EXISTS' : COLORS.red + 'MISSING';
    console.log(`  [${status}] ${p}${COLORS.reset}`);
    if (exists) {
      try {
        const stats = fs.statSync(p);
        const entries = fs.readdirSync(p);
        console.log(`    ${COLORS.dim}Type: ${stats.isDirectory() ? 'directory' : 'file'}, Entries: ${entries.length}${COLORS.reset}`);
      } catch (e) {
        console.log(`    ${COLORS.yellow}Cannot read: ${e.message}${COLORS.reset}`);
      }
    }
  }
}

async function checkDatabase(client) {
  header('2. DATABASE - SCANNER ROOTS');

  const rootsResult = await client.query('SELECT * FROM scanner_roots ORDER BY label');
  const roots = rootsResult.rows;

  if (roots.length === 0) {
    log(COLORS.yellow, 'No scanner roots found in database!');
    return;
  }

  console.log(`  Found ${COLORS.bold}${roots.length}${COLORS.reset} scanner root(s):\n`);

  const brokenRoots = [];
  const healthyRoots = [];

  for (const root of roots) {
    const exists = fs.existsSync(root.scan_path);
    const status = exists ? COLORS.green + 'EXISTS' : COLORS.red + 'BROKEN';
    console.log(`  [${status}] ${root.id}`);
    console.log(`    Label:    ${root.label}`);
    console.log(`    scanPath: ${root.scan_path}`);
    console.log(`    publicUrl: ${root.public_base_url}`);
    console.log(`    type:     ${root.type}, enabled: ${root.enabled}, discovered: ${root.discovered}`);

    if (exists) {
      try {
        const entries = fs.readdirSync(root.scan_path);
        const videoFiles = entries.filter(f => /\.(mp4|mkv|avi|mov|wmv|ts|m2ts)$/i.test(f));
        console.log(`    ${COLORS.green}Contents: ${entries.length} entries, ~${videoFiles.length} top-level video files${COLORS.reset}`);
      } catch (e) {
        console.log(`    ${COLORS.yellow}Cannot read directory: ${e.message}${COLORS.reset}`);
      }
      healthyRoots.push(root);
    } else {
      console.log(`    ${COLORS.red}ERROR: Path does not exist on filesystem!${COLORS.reset}`);
      brokenRoots.push(root);
    }
    console.log('');
  }

  if (brokenRoots.length > 0) {
    log(COLORS.red, `\n  ⚠ ${brokenRoots.length} BROKEN ROOT(S) - these paths don't exist on disk:`);
    for (const r of brokenRoots) {
      log(COLORS.red, `    - ${r.id}: ${r.scan_path}`);
    }
  }

  return { roots, brokenRoots, healthyRoots };
}

async function checkContentCatalog(client) {
  header('3. DATABASE - CONTENT CATALOG PATHS');

  const totalResult = await client.query('SELECT COUNT(*)::int AS count FROM content_catalog');
  const total = totalResult.rows[0].count;
  console.log(`  Total content items: ${COLORS.bold}${total}${COLORS.reset}`);

  const statusResult = await client.query(
    `SELECT status, COUNT(*)::int AS count FROM content_catalog GROUP BY status ORDER BY count DESC`
  );
  console.log('\n  By status:');
  for (const row of statusResult.rows) {
    const color = row.status === 'published' ? COLORS.green : row.status === 'draft' ? COLORS.yellow : COLORS.dim;
    console.log(`    ${color}${row.status}: ${row.count}${COLORS.reset}`);
  }

  subHeader('Sample sourcePath Check (first 10)');
  const sampleResult = await client.query(
    `SELECT id, payload->>'title' AS title, payload->>'sourcePath' AS source_path,
            payload->>'videoUrl' AS video_url, payload->>'type' AS content_type
     FROM content_catalog
     WHERE payload->>'sourcePath' IS NOT NULL AND payload->>'sourcePath' <> ''
     ORDER BY id
     LIMIT 10`
  );

  const brokenItems = [];
  const healthyItems = [];

  for (const row of sampleResult.rows) {
    const exists = row.source_path ? fs.existsSync(row.source_path) : false;
    const status = exists ? COLORS.green + 'OK' : COLORS.red + 'BROKEN';
    console.log(`\n  [${status}] ID:${row.id} "${row.title}" (${row.content_type})${COLORS.reset}`);
    console.log(`    sourcePath: ${COLORS.dim}${row.source_path}${COLORS.reset}`);
    console.log(`    videoUrl:   ${COLORS.dim}${row.video_url}${COLORS.reset}`);
    if (!exists && row.source_path) {
      brokenItems.push(row);
    } else if (exists) {
      healthyItems.push(row);
    }
  }

  subHeader('Checking ALL content items for broken paths (this may take a moment...)');
  
  const allItems = await client.query(
    `SELECT id, payload->>'sourcePath' AS source_path
     FROM content_catalog
     WHERE payload->>'sourcePath' IS NOT NULL AND payload->>'sourcePath' <> ''`
  );

  let allHealthy = 0;
  let allBroken = 0;
  const brokenPathPrefixes = {};

  for (const row of allItems.rows) {
    if (fs.existsSync(row.source_path)) {
      allHealthy++;
    } else {
      allBroken++;
      const prefix = row.source_path.split('/').slice(0, 4).join('/') || row.source_path;
      brokenPathPrefixes[prefix] = (brokenPathPrefixes[prefix] || 0) + 1;
    }
  }

  console.log(`\n  Results: ${COLORS.green}${allHealthy} healthy${COLORS.reset} / ${COLORS.red}${allBroken} broken${COLORS.reset} / ${allItems.rows.length} total`);

  if (Object.keys(brokenPathPrefixes).length > 0) {
    subHeader('Broken Path Prefixes (grouped)');
    const sorted = Object.entries(brokenPathPrefixes).sort((a, b) => b[1] - a[1]);
    for (const [prefix, count] of sorted) {
      console.log(`  ${COLORS.red}${count} items${COLORS.reset} missing under: ${prefix}`);
    }
  }

  return { total, allHealthy, allBroken, brokenPathPrefixes };
}

async function checkEpisodes(client) {
  subHeader('4. SERIES EPISODES PATH CHECK');

  const episodesResult = await client.query(
    `SELECT id, payload->>'title' AS title,
            payload->>'seasonCount' AS season_count,
            payload->>'episodeCount' AS episode_count
     FROM content_catalog
     WHERE content_type = 'series'
     LIMIT 5`
  );

  if (episodesResult.rows.length === 0) {
    console.log('  No series found.');
    return;
  }

  let brokenEpisodes = 0;
  let totalEpisodes = 0;

  for (const row of episodesResult.rows) {
    const fullResult = await client.query('SELECT payload FROM content_catalog WHERE id = $1', [row.id]);
    const payload = fullResult.rows[0]?.payload;
    if (!payload?.seasons) continue;

    console.log(`\n  Series: "${row.title}" (ID: ${row.id})`);
    for (const season of payload.seasons) {
      for (const episode of (season.episodes || [])) {
        totalEpisodes++;
        const epPath = episode.sourcePath;
        if (epPath && !fs.existsSync(epPath)) {
          brokenEpisodes++;
          if (brokenEpisodes <= 3) {
            console.log(`    ${COLORS.red}BROKEN S${season.number}E${episode.number}: ${epPath}${COLORS.reset}`);
          }
        }
      }
    }
  }

  console.log(`\n  Episodes checked: ${totalEpisodes}, Broken: ${COLORS.red}${brokenEpisodes}${COLORS.reset}`);
}

function generateFixSuggestions(scannerRootsResult, catalogResult) {
  header('5. SUGGESTED FIXES');

  if (!scannerRootsResult || !catalogResult) {
    log(COLORS.yellow, 'Could not generate fixes - earlier checks failed.');
    return;
  }

  const { brokenRoots, healthyRoots } = scannerRootsResult;
  const { brokenPathPrefixes, allBroken } = catalogResult;

  if (allBroken === 0) {
    log(COLORS.green, 'All paths are healthy! No fixes needed.');
    log(COLORS.green, 'If media still not playing, check:');
    console.log('  - Is the backend server running?');
    console.log('  - Is the frontend pointing to the correct API?');
    console.log('  - Check browser console for CORS/network errors');
    return;
  }

  console.log(`${COLORS.bold}Problem Summary:${COLORS.reset}`);
  console.log(`  - ${COLORS.red}${brokenRoots?.length || 0} broken scanner root(s)${COLORS.reset}`);
  console.log(`  - ${COLORS.red}${allBroken} content items with broken sourcePath${COLORS.reset}`);

  if (brokenRoots && brokenRoots.length > 0) {
    console.log(`\n${COLORS.bold}Option A: If mount points changed (same disk, different path):${COLORS.reset}`);
    console.log('  1. Update scanner_roots in database:');
    for (const root of brokenRoots) {
      console.log(`     UPDATE scanner_roots SET scan_path = '/NEW_PATH_HERE' WHERE id = '${root.id}';`);
    }
    console.log('  2. Update content_catalog sourcePath:');
    console.log('     UPDATE content_catalog SET payload = jsonb_set(payload, \'{sourcePath}\',');
    console.log('       to_jsonb(REPLACE(payload->>\'sourcePath\', \'OLD_PREFIX\', \'NEW_PREFIX\')))');
    console.log('     WHERE payload->>\'sourcePath\' LIKE \'OLD_PREFIX%\';');
    console.log('  3. Restart the backend server');
    console.log('  4. Re-run scanner: POST /api/admin/scanner/run');

    console.log(`\n${COLORS.bold}Option B: If disk needs to be mounted at old path:${COLORS.reset}`);
    console.log('  1. Identify the new disk: lsblk');
    console.log('  2. Mount at expected path:');
    for (const root of brokenRoots) {
      console.log(`     sudo mkdir -p ${root.scan_path}`);
      console.log(`     sudo mount /dev/sdXN ${root.scan_path}  # replace sdXN with actual partition`);
    }
    console.log('  3. Make permanent in /etc/fstab');

    console.log(`\n${COLORS.bold}Option C: Re-scan everything (paths are correct but stale):${COLORS.reset}`);
    console.log('  1. Ensure all disks are mounted correctly');
    console.log('  2. Run: POST /api/admin/scanner/roots/cleanup  (removes stale roots)');
    console.log('  3. Run: POST /api/admin/scanner/run  (re-index all content)');
  }

  console.log(`\n${COLORS.bold}Quick Fix Commands:${COLORS.reset}`);
  console.log('  # Check current scanner roots:');
  console.log('  psql -U postgres -d isp_entertainment -c "SELECT id, scan_path, public_base_url FROM scanner_roots;"');
  console.log('');
  console.log('  # Check sample content paths:');
  console.log('  psql -U postgres -d isp_entertainment -c "SELECT id, payload->>\'title\', payload->>\'sourcePath\' FROM content_catalog LIMIT 10;"');
  console.log('');
  console.log('  # Count broken paths:');
  console.log('  psql -U postgres -d isp_entertainment -c "SELECT COUNT(*) FROM content_catalog WHERE payload->>\'sourcePath\' IS NOT NULL AND payload->>\'sourcePath\' <> \'\';"');
}

async function main() {
  console.log(COLORS.bold + COLORS.cyan);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Speed4You - Media Path Diagnostics                     ║');
  console.log('║  Post-Reboot/Remount Path Verification                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);
  console.log('  Timestamp: ' + new Date().toISOString());

  const client = await pool.connect();
  let scannerRootsResult;
  let catalogResult;

  try {
    await checkMountPoints();
    scannerRootsResult = await checkDatabase(client);
    catalogResult = await checkContentCatalog(client);
    await checkEpisodes(client);
    generateFixSuggestions(scannerRootsResult, catalogResult);
  } catch (error) {
    log(COLORS.red, '\nERROR:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
