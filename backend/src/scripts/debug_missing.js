require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { buildSeriesSeasons, slugify, cleanTitle } = require('../services/scanner-series-parser');
const { isPathReadable, listDirectoryEntriesSafe } = require('../services/scanner-permission-handler');

// Mock helper options for buildSeriesSeasons
const VIDEO_EXTENSIONS = new Set(
  String(process.env.SCANNER_VIDEO_EXTENSIONS || '.mp4,.mkv,.avi,.mov,.wmv,.m4v,.webm,.ts,.m2ts,.mpg,.mpeg,.3gp,.flv,.vob')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);
const MIN_EPISODE_SIZE = Number(process.env.SCANNER_MIN_EPISODE_SIZE || 52428800); // 50MB
const JUNK_REGEX = /\b(sample|trailer|extras?|promo|short|clip|preview|teaser|behind\s*the\s*scenes|yts\.mx|advertisement|featurette)\b/i;

function isValidMediaFile(filePath) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(ext)) return { valid: false, reason: `Invalid extension: ${ext}` };
  if (JUNK_REGEX.test(filename)) return { valid: false, reason: `Matches junk regex: ${filename}` };
  try {
    const stats = fs.statSync(filePath);
    if (stats.size < MIN_EPISODE_SIZE) {
      return { valid: false, reason: `Size too small: ${(stats.size/1024/1024).toFixed(2)} MB < ${(MIN_EPISODE_SIZE/1024/1024).toFixed(2)} MB` };
    }
  } catch (e) {
    return { valid: false, reason: `Stat error: ${e.message}` };
  }
  return { valid: true };
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => {
      try { return fs.statSync(path.join(dir, f)).isFile(); } catch(e) { return false; }
    });
  } catch(e) { return []; }
}

function listDirectories(dir) {
  try {
    return fs.readdirSync(dir).filter(f => {
      try { return fs.statSync(path.join(dir, f)).isDirectory(); } catch(e) { return false; }
    });
  } catch(e) { return []; }
}

function listVideoFiles(files, dir) {
  return files.filter(f => isValidMediaFile(path.join(dir, f)).valid);
}

function toPublicUrl(root, p) {
  return p;
}

async function debugMissing() {
  const reqPath = '/var/www/html/Requested/Series';
  const root = { id: 'requested-series', scanPath: reqPath };
  const dirs = fs.readdirSync(reqPath).filter(f => fs.statSync(path.join(reqPath, f)).isDirectory());

  const dbRes = await query("SELECT id, title, payload FROM content_catalog WHERE content_type = 'series'");

  console.log('=== DEBUGGING MISSING FOLDERS ===\n');

  for (const folderName of dirs) {
    const folderPath = path.join(reqPath, folderName);
    const inDb = dbRes.rows.some(r => JSON.stringify(r.payload || {}).includes(folderName));

    if (!inDb) {
      console.log(`[MISSING] Folder: "${folderName}"`);
      const readable = isPathReadable(folderPath);
      console.log(`  Path Readable: ${readable}`);

      const files = listFiles(folderPath);
      const subdirs = listDirectories(folderPath);
      console.log(`  Files directly in folder: ${files.length}`);
      console.log(`  Subdirectories: ${subdirs.join(', ')}`);

      // Test isValidMediaFile for direct files
      for (const f of files) {
        const check = isValidMediaFile(path.join(folderPath, f));
        console.log(`    File "${f}": ${check.valid ? 'VALID' : 'INVALID (' + check.reason + ')'}`);
      }

      // Test buildSeriesSeasons
      const options = {
        listFiles,
        listDirectories,
        listVideoFiles,
        toPublicUrl,
        findSubtitleFile: () => '',
      };
      const { seasons } = buildSeriesSeasons(root, folderName, folderPath, options);
      console.log(`  Resulting Seasons Count: ${seasons.length}`);
      if (!seasons.length) {
        console.log(`  --> SKIPPED BY SCANNER because seasons count is 0!\n`);
      } else {
        console.log(`  --> SEASONS OK (${seasons.length} seasons, ${seasons.reduce((s, x) => s + x.episodes.length, 0)} episodes)\n`);
      }
    }
  }

  process.exit(0);
}

debugMissing().catch(console.error);
