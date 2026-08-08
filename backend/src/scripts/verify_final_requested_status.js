/**
 * verify_final_requested_status.js
 * Check exact total folders vs DB published/draft entries for /Requested/Series/
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('/var/www/html/Requested/Series/' ? 'path' : 'path');

async function verify() {
  const rootPath = '/var/www/html/Requested/Series';
  
  // 1. Get real directory count from disk
  const diskFolders = fs.readdirSync(rootPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`=== DISK ANALYSIS ===`);
  console.log(`Total folders found in ${rootPath}: ${diskFolders.length}`);

  // 2. Get DB state
  const dbRes = await query(`
    SELECT id, title, status, metadata_status, payload->>'poster' AS poster, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE '%/Requested/Series/%'
    ORDER BY status, title
  `);

  const rows = dbRes.rows;
  const published = rows.filter(r => r.status === 'published');
  const draft = rows.filter(r => r.status === 'draft');

  console.log(`\n=== DATABASE ANALYSIS ===`);
  console.log(`Total DB entries linked to /Requested/Series/: ${rows.length}`);
  console.log(`- PUBLISHED: ${published.length}`);
  console.log(`- DRAFT: ${draft.length}`);

  console.log(`\n--- PUBLISHED ITEMS (${published.length}) ---`);
  published.forEach(r => {
    console.log(`  ✓ ID:${r.id} "${r.title}" (poster: ${Boolean(r.poster)})`);
  });

  console.log(`\n--- DRAFT ITEMS (${draft.length}) ---`);
  draft.forEach(r => {
    console.log(`  ✗ ID:${r.id} "${r.title}" (metaStatus: ${r.metadata_status})`);
  });

  // Check if any disk folder is missing from DB entirely
  const dbPaths = new Set(rows.map(r => r.source_path));
  const missingFromDb = diskFolders.filter(folderName => {
    const fullPath = `${rootPath}/${folderName}`;
    return !dbPaths.has(fullPath);
  });

  console.log(`\n=== MISSING FROM DB ENTIRELY (${missingFromDb.length}) ===`);
  missingFromDb.forEach(f => console.log(`  ⚠ ${f}`));

  process.exit(0);
}

verify().catch(console.error);
