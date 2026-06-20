/**
 * fix-duplicates.js
 *
 * Finds and removes duplicate content entries. For each duplicate group,
 * keeps the item with a valid file path and removes the broken one.
 * Also can fix the videoUrl/paths on the kept item if needed.
 *
 * Usage:
 *   node backend/scripts/fix-duplicates.js --dry-run    # Preview only (safe)
 *   node backend/scripts/fix-duplicates.js              # Actually delete duplicates
 *   node backend/scripts/fix-duplicates.js --verbose    # Show all details
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

function normalizeTitleKey(value, year) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\b(1080p|720p|480p|2160p|web[- ]?dl|bluray|brrip|x264|x265|hdrip|dvdrip|proper|uncut)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const key = normalized || String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (year) return key + '-' + year;
  return key;
}

function checkPath(p) {
  if (!p) return { exists: false, isFile: false, isDir: false };
  try {
    const s = fs.statSync(p);
    return { exists: true, isFile: s.isFile(), isDir: s.isDirectory() };
  } catch {
    return { exists: false, isFile: false, isDir: false };
  }
}

function resolveVideoPath(item) {
  // Try sourcePath first
  if (item.sourcePath) {
    const r = checkPath(item.sourcePath);
    if (r.exists && (r.isFile || r.isDir)) return { path: item.sourcePath, method: 'sourcePath', ...r };
  }

  // Try to find the video in sourcePath directory
  if (item.sourcePath && checkPath(item.sourcePath).isDir) {
    const files = fs.readdirSync(item.sourcePath).filter(f => /\.(mp4|mkv|avi|mov|webm|m4v|wmv|ts|m2ts)$/i.test(f));
    if (files.length > 0) {
      const videoPath = path.join(item.sourcePath, files[0]);
      return { path: videoPath, method: 'sourceDir', ...checkPath(videoPath) };
    }
  }

  // Try to derive from videoUrl using scanner roots
  if (item.videoUrl) {
    // The videoUrl is like /movies/Title (2020)/file.mp4
    // On production, files are served from a media root
    const MEDIA_ROOTS = [
      process.env.SCANNER_MEDIA_ROOT || '/var/www/html',
      '/mnt/media',
      '/data/media',
      '/media',
    ];
    for (const root of MEDIA_ROOTS) {
      const candidate = path.join(root, item.videoUrl);
      const r = checkPath(candidate);
      if (r.exists) return { path: candidate, method: 'videoUrl+root', ...r };
    }
  }

  return { exists: false, isFile: false, isDir: false };
}

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN MODE - no changes will be made ===\n');
  }

  // 1. Fetch all items
  const result = await pool.query('SELECT id, payload FROM content_catalog ORDER BY id ASC');
  const allItems = result.rows.map(r => ({
    id: r.id,
    payload: r.payload,
    titleKey: r.payload.title_key || normalizeTitleKey(r.payload.title, r.payload.year),
  }));

  // 2. Group by type:titleKey
  const groups = new Map();
  for (const item of allItems) {
    const key = item.payload.type + ':' + item.titleKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  // 3. Filter duplicates
  const duplicateGroups = [...groups.entries()].filter(([, items]) => items.length > 1);
  console.log('Found ' + duplicateGroups.length + ' duplicate groups.\n');

  let totalRemoved = 0;
  let totalFixed = 0;

  for (const [key, items] of duplicateGroups) {
    const [type] = key.split(':');
    const title = items[0].payload.title || key;
    console.log('Group: "' + title + '" (' + type + ')');
    console.log('  Items: ' + items.map(i => 'ID:' + i.id).join(', '));

    // Rate each item: 0 = broken, 1 = has valid sourcePath, 2 = has valid sourcePath + videoUrl
    const rated = items.map(item => {
      const p = item.payload;
      const sourceCheck = checkPath(p.sourcePath);
      let score = 0;
      let workingPath = null;

      if (sourceCheck.exists && sourceCheck.isFile) {
        score = 2;
        workingPath = p.sourcePath;
      } else if (sourceCheck.exists && sourceCheck.isDir) {
        // Check if dir has video files
        try {
          const videoFiles = fs.readdirSync(p.sourcePath).filter(f => /\.(mp4|mkv|avi|mov|webm|m4v)$/i.test(f));
          if (videoFiles.length > 0) {
            score = 2;
            workingPath = path.join(p.sourcePath, videoFiles[0]);
          } else {
            score = 0;
          }
        } catch { score = 0; }
      } else if (p.videoUrl) {
        // videoUrl might exist remotely even if sourcePath is missing
        score = 1;
      }

      return { ...item, score, workingPath };
    });

    // Sort by score descending, then by ID descending (newer first)
    rated.sort((a, b) => b.score - a.score || b.id - a.id);

    const best = rated[0];
    const duplicates = rated.slice(1);

    console.log('  Best: ID=' + best.id + ' (score=' + best.score + ')');
    for (const dup of duplicates) {
      console.log('  Dup:  ID=' + dup.id + ' (score=' + dup.score + ')');
    }

    // Check if the best item has broken videoUrl but correct sourcePath:
    // If so, fix the videoUrl based on scanner roots
    if (best.score >= 1 && best.workingPath && !best.payload.videoUrl) {
      console.log('  -> Best item has sourcePath but no videoUrl (will fix)');
      if (!DRY_RUN) {
        const newPayload = { ...best.payload, videoUrl: best.payload.videoUrl || best.payload.sourcePublicPath || '' };
        await pool.query('UPDATE content_catalog SET payload = $2::jsonb WHERE id = $1', [best.id, JSON.stringify(newPayload)]);
        totalFixed++;
      }
    }

    // Remove duplicate entries (but keep the best one)
    for (const dup of duplicates) {
      if (!DRY_RUN) {
        await pool.query('DELETE FROM content_catalog WHERE id = $1', [dup.id]);
      }
      console.log('  -> ' + (DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted') + ' ID=' + dup.id + ' (score=' + dup.score + ')');
      totalRemoved++;
    }

    // Fix duplicateCount on the kept item
    if (!DRY_RUN && best) {
      const newPayload = { ...best.payload, duplicateCount: 0 };
      await pool.query('UPDATE content_catalog SET payload = $2::jsonb WHERE id = $1', [best.id, JSON.stringify(newPayload)]);
    }

    console.log('');
  }

  console.log('=== Summary ===');
  console.log('Duplicate groups: ' + duplicateGroups.length);
  console.log('Items removed: ' + totalRemoved);
  if (!DRY_RUN) console.log('Items fixed: ' + totalFixed);
  if (DRY_RUN) console.log('\nRun without --dry-run to apply changes.');
  console.log('');

  // Recalculate all duplicate_counts for remaining items
  if (!DRY_RUN && (totalRemoved > 0 || totalFixed > 0)) {
    console.log('Recalculating duplicate counts...');
    const allResult2 = await pool.query('SELECT id, payload FROM content_catalog ORDER BY id ASC');
    const remaining = allResult2.rows.map(r => ({
      id: r.id, payload: r.payload,
      titleKey: r.payload.title_key || normalizeTitleKey(r.payload.title, r.payload.year),
    }));
    const groupMap = new Map();
    for (const item of remaining) {
      const k = item.payload.type + ':' + item.titleKey;
      if (!groupMap.has(k)) groupMap.set(k, []);
      groupMap.get(k).push(item);
    }
    for (const item of remaining) {
      const k = item.payload.type + ':' + item.titleKey;
      const g = groupMap.get(k) || [];
      const itemRoot = String(item.payload.sourceRootId || '').trim();
      const realCount = g.filter(c => c.id !== item.id && (!itemRoot || String(c.payload.sourceRootId || '').trim() !== itemRoot)).length;
      if (realCount !== Number(item.payload.duplicateCount || 0)) {
        await pool.query('UPDATE content_catalog SET payload = $2::jsonb WHERE id = $1', [item.id, JSON.stringify({ ...item.payload, duplicateCount: realCount })]);
      }
    }
    console.log('Done.');
  }

  await pool.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
