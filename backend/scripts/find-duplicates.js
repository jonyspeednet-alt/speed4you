/**
 * find-duplicates.js
 *
 * Finds all duplicate content entries in the catalog (same title_key, same type).
 * For each duplicate group, shows details so you can decide which to keep/delete.
 *
 * Usage:
 *   node backend/scripts/find-duplicates.js              # basic report
 *   node backend/scripts/find-duplicates.js --check-paths  # also checks if file paths exist
 *   node backend/scripts/find-duplicates.js --delete-broken # auto-delete duplicates whose file is missing
 *   node backend/scripts/find-duplicates.js --keep=ID      # for interactive: keep specific ID, delete others
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

function normalizeTitleKey(value, year) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\b(1080p|720p|480p|2160p|web[- ]?dl|bluray|brrip|x264|x265|hdrip|dvdrip|proper|uncut)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const key = normalized || String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (year) return `${key}-${year}`;
  return key;
}

const args = process.argv.slice(2);
const CHECK_PATHS = args.includes('--check-paths');
const DELETE_BROKEN = args.includes('--delete-broken');
let KEEP_ID = null;
const keepIdx = args.indexOf('--keep');
if (keepIdx !== -1 && keepIdx + 1 < args.length) {
  KEEP_ID = Number(args[keepIdx + 1]);
}

async function main() {
  // Fetch ALL items from catalog
  const result = await pool.query('SELECT id, payload FROM content_catalog ORDER BY id ASC');
  const allItems = result.rows.map(r => {
    const p = r.payload;
    return { id: r.id, payload: p, titleKey: p.title_key || normalizeTitleKey(p.title, p.year) };
  });

  // Group by type + titleKey
  const groups = new Map();
  for (const item of allItems) {
    const key = `${item.payload.type}:${item.titleKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  // Filter to only duplicates (count > 1)
  const duplicateGroups = [...groups.entries()].filter(([, items]) => items.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate groups found. Catalog is clean.');
    await pool.end();
    return;
  }

  console.log('Found ' + duplicateGroups.length + ' duplicate groups:\n');

  let totalDuplicates = 0;
  let totalDeleted = 0;

  for (const [key, items] of duplicateGroups) {
    const [type, titleKey] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const title = items[0].payload.title || titleKey;
    console.log('=== Group: ' + title + ' (' + type + ', title_key: ' + titleKey + ') ===');
    console.log('   Count: ' + items.length + ' | IDs: ' + items.map(i => i.id).join(', '));

    for (const item of items) {
      const p = item.payload;
      let pathStatus = '';
      let fileInfo = '';

      if (CHECK_PATHS || DELETE_BROKEN) {
        const sourcePath = p.sourcePath || '';
        const videoUrl = p.videoUrl || '';
        if (sourcePath && fs.existsSync(sourcePath)) {
          pathStatus = '[PATH OK]';
          const stat = fs.statSync(sourcePath);
          if (stat.isFile()) {
            fileInfo = ' (file, ' + Math.round(stat.size / 1024 / 1024) + 'MB)';
          } else if (stat.isDirectory()) {
            const videoFiles = fs.readdirSync(sourcePath).filter(f => /\.(mp4|mkv|avi|mov|webm|m4v)$/i.test(f));
            fileInfo = ' (dir, ' + videoFiles.length + ' video files)';
          }
        } else {
          pathStatus = '[PATH MISSING]';
        }
      }

      console.log('   ID: ' + item.id + ' | Title: "' + p.title + '" | Status: ' + p.status + ' | DuplicateCount: ' + (p.duplicateCount || 0));
      console.log('       SourcePath: ' + (p.sourcePath || 'N/A'));
      console.log('       VideoUrl: ' + (p.videoUrl || 'N/A'));
      console.log('       ScanSignature: ' + (p.scanSignature || 'N/A'));
      console.log('       SourceRootId: ' + (p.sourceRootId || 'N/A'));
      if (pathStatus) console.log('       ' + pathStatus + fileInfo);

      // Fix the path if we're checking paths
      if (DELETE_BROKEN && p.sourcePath && !fs.existsSync(p.sourcePath) && p.status !== 'published') {
        // Don't auto-delete published items unless --delete-broken is explicit
        if (p.status === 'draft' || p.status === 'pending') {
          await pool.query('DELETE FROM content_catalog WHERE id = $1', [item.id]);
          console.log('       >>> DELETED (missing path, draft status)');
          totalDeleted++;
        } else if (KEEP_ID && item.id !== KEEP_ID) {
          await pool.query('DELETE FROM content_catalog WHERE id = $1', [item.id]);
          console.log('       >>> DELETED (--keep=' + KEEP_ID + ' specified, this is the duplicate)');
          totalDeleted++;
        }
      }
    }
    console.log('');
    totalDuplicates += items.length - 1;
  }

  console.log('Summary: ' + duplicateGroups.length + ' groups, ' + totalDuplicates + ' excess duplicates, ' + totalDeleted + ' deleted.');

  if (DELETE_BROKEN || KEEP_ID) {
    // Recalculate all duplicate counts
    console.log('\nRecalculating duplicate counts...');
    const allResult = await pool.query('SELECT id, payload FROM content_catalog ORDER BY id ASC');
    const remaining = allResult.rows.map(r => {
      const p = r.payload;
      return { id: r.id, payload: p, titleKey: p.title_key || normalizeTitleKey(p.title, p.year) };
    });
    const newGroups = new Map();
    for (const item of remaining) {
      const k = `${item.payload.type}:${item.titleKey}`;
      if (!newGroups.has(k)) newGroups.set(k, []);
      newGroups.get(k).push(item);
    }
    for (const item of remaining) {
      const k = `${item.payload.type}:${item.titleKey}`;
      const group = newGroups.get(k) || [];
      const itemRoot = String(item.payload.sourceRootId || '').trim();
      const realCount = group.filter(c => c.id !== item.id && (!itemRoot || String(c.payload.sourceRootId || '').trim() !== itemRoot)).length;
      const newPayload = { ...item.payload, duplicateCount: realCount };
      await pool.query('UPDATE content_catalog SET payload = $2::jsonb WHERE id = $1', [item.id, JSON.stringify(newPayload)]);
    }
    console.log('Duplicate counts recalculated.');
  }

  await pool.end();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
