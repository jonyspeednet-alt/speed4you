/**
 * verify_requested_movies.js
 * Check disk movie files vs DB published/draft entries for /Requested/Movies/
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function verifyMovies() {
  const rootPath = '/var/www/html/Requested/Movies';
  
  // Get video extensions list
  const extSet = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.ts', '.flv']);

  // Helper to recursively find video files
  function findVideoFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(findVideoFiles(fullPath));
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (extSet.has(ext)) {
          // Exclude sample files
          if (!/\bsample\b/i.test(item.name)) {
            results.push(fullPath);
          }
        }
      }
    }
    return results;
  }

  const diskFiles = findVideoFiles(rootPath);
  console.log(`=== DISK ANALYSIS (/Requested/Movies/) ===`);
  console.log(`Total video files found: ${diskFiles.length}`);

  // DB Analysis
  const dbRes = await query(`
    SELECT id, title, status, metadata_status, payload->>'poster' AS poster, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE content_type = 'movie'
      AND payload->>'sourcePath' LIKE '%/Requested/Movies/%'
    ORDER BY status, title
  `);

  const rows = dbRes.rows;
  const published = rows.filter(r => r.status === 'published');
  const draft = rows.filter(r => r.status === 'draft');

  console.log(`\n=== DATABASE ANALYSIS ===`);
  console.log(`Total DB entries linked to /Requested/Movies/: ${rows.length}`);
  console.log(`- PUBLISHED: ${published.length}`);
  console.log(`- DRAFT: ${draft.length}`);

  console.log(`\n--- PUBLISHED MOVIES (${published.length}) ---`);
  published.forEach(r => {
    console.log(`  ✓ ID:${r.id} "${r.title}" (poster: ${Boolean(r.poster)})`);
  });

  if (draft.length > 0) {
    console.log(`\n--- DRAFT MOVIES (${draft.length}) ---`);
    draft.forEach(r => {
      console.log(`  ✗ ID:${r.id} "${r.title}" (metaStatus: ${r.metadata_status})`);
    });
  }

  process.exit(0);
}

verifyMovies().catch(console.error);
