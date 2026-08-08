/**
 * thorough_audit_tv_t.js
 * Audit disk folders vs DB entries for /var/www/html/TV_Series/TV_Web_Series-T/
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function auditT() {
  const rootPath = '/var/www/html/TV_Series/TV_Web_Series-T';
  
  console.log(`=== AUDIT FOR: ${rootPath} ===\n`);

  if (!fs.existsSync(rootPath)) {
    console.log(`❌ Path does not exist: ${rootPath}`);
    process.exit(1);
  }

  // 1. Physical Folders
  const diskFolders = fs.readdirSync(rootPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`1. PHYSICAL DISK SERIES FOLDERS COUNT: ${diskFolders.length}`);

  // 2. Fetch DB Records
  const dbRes = await query(`
    SELECT id, title, status, metadata_status,
           payload->>'poster' AS poster,
           payload->>'sourcePath' AS source_path,
           payload->>'tmdbId' AS tmdb_id,
           payload->>'metadataConfidence' AS confidence
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
    ORDER BY title
  `, [`%${rootPath}%`]);

  const rows = dbRes.rows;
  console.log(`2. TOTAL DB RECORDS COUNT: ${rows.length}`);

  const published = rows.filter(r => r.status === 'published');
  const draft = rows.filter(r => r.status === 'draft');

  const goodMeta = rows.filter(r => r.metadata_status === 'matched' && Boolean(r.poster && r.poster.startsWith('http')));
  const missingPoster = rows.filter(r => r.metadata_status === 'matched' && !Boolean(r.poster && r.poster.startsWith('http')));
  const unmatched = rows.filter(r => r.metadata_status !== 'matched');

  const dbPaths = new Set(rows.map(r => r.source_path));
  const missingFolders = diskFolders.filter(f => !dbPaths.has(path.join(rootPath, f)));

  console.log(`\n========================================`);
  console.log(`AUDIT RESULTS FOR TV_Web_Series-T:`);
  console.log(`- Physical Folders on Disk: ${diskFolders.length}`);
  console.log(`- Total Series in DB: ${rows.length}`);
  console.log(`- PUBLISHED: ${published.length}`);
  console.log(`- DRAFT: ${draft.length}`);
  console.log(``);
  console.log(`METADATA QUALITY BREAKDOWN:`);
  console.log(`✓ 1. Good Metadata + Poster: ${goodMeta.length}`);
  console.log(`⚠ 2. Matched but Missing Poster: ${missingPoster.length}`);
  console.log(`❌ 3. Metadata Not Found / Unmatched: ${unmatched.length}`);
  console.log(`⚠ 4. Disk Folders Missing from DB: ${missingFolders.length}`);
  console.log(`========================================`);

  if (missingFolders.length > 0) {
    console.log(`\nDisk Folders Missing from DB (${missingFolders.length}):`);
    missingFolders.forEach(f => console.log(`  - "${f}"`));
  }

  if (unmatched.length > 0) {
    console.log(`\nUnmatched Metadata Items (${unmatched.length}):`);
    unmatched.slice(0, 30).forEach(u => console.log(`  - ID:${u.id} "${u.title}" (meta:${u.metadata_status}, conf:${u.confidence})`));
  }

  process.exit(0);
}

auditT().catch(console.error);
