/**
 * inspect_uz_folders.js
 * Inspect exact disk folder names and DB details for TV_Web_Series-U-Z
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');

async function inspectUZ() {
  const rootPath = '/var/www/html/TV_Series/TV_Web_Series-U-Z';
  const folders = fs.readdirSync(rootPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`=== PHYSICAL DISK FOLDERS IN TV_Web_Series-U-Z (${folders.length}) ===`);
  folders.forEach(f => console.log(`  - "${f}"`));

  const dbRes = await query(`
    SELECT id, title, status, metadata_status, payload->>'poster' AS poster, payload->>'tmdbId' AS tmdb_id
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
  `, [`%${rootPath}%`]);

  console.log(`\n=== DB RECORDS (${dbRes.rows.length}) ===`);
  dbRes.rows.forEach(r => {
    console.log(`  ✓ ID:${r.id} title:"${r.title}" tmdbId:${r.tmdb_id} status:${r.status} poster:${Boolean(r.poster && r.poster.startsWith('http'))}`);
  });

  process.exit(0);
}

inspectUZ().catch(console.error);
