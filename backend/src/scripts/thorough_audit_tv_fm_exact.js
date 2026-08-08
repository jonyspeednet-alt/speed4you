/**
 * thorough_audit_tv_fm_exact.js
 * Exact audit of /var/www/html/TV_Series/TV_Web_Series-F-M/
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function auditFM() {
  const rootPath = '/var/www/html/TV_Series/TV_Web_Series-F-M';
  
  console.log(`=== FULL AUDIT FOR: ${rootPath} ===\n`);

  const diskFolders = fs.readdirSync(rootPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`1. Physical Disk Series Folders Count: ${diskFolders.length}`);
  diskFolders.forEach(f => console.log(`   - "${f}"`));

  // Query DB items under this path
  const dbRes = await query(`
    SELECT id, title, status, metadata_status,
           payload->>'poster' AS poster,
           payload->>'sourcePath' AS source_path,
           payload->>'tmdbId' AS tmdb_id
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
    ORDER BY title
  `, [`%${rootPath}%`]);

  console.log(`\n2. Database Records Count: ${dbRes.rows.length}`);
  dbRes.rows.forEach(r => {
    console.log(`   - ID:${r.id} title:"${r.title}" status:${r.status} meta:${r.metadata_status} poster:${Boolean(r.poster && r.poster.startsWith('http'))}`);
  });

  const missingFromDb = diskFolders.filter(f => !dbRes.rows.some(r => r.source_path === path.join(rootPath, f)));
  if (missingFromDb.length > 0) {
    console.log(`\n3. Disk Folders Missing from DB (${missingFromDb.length}):`);
    missingFromDb.forEach(m => console.log(`   ⚠ "${m}"`));
  }

  process.exit(0);
}

auditFM().catch(console.error);
