/**
 * verify_tv_ae_status.js
 * Inspects folders in /var/www/html/TV_Series/TV_Web_Series-0-9_A-E/ vs DB entries and runs scan
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { startScanJob, getCurrentScanJob } = require('../services/scanner');

async function verifyAndScanAE() {
  const rootPath = '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E';
  
  if (!fs.existsSync(rootPath)) {
    console.log(`Directory does not exist: ${rootPath}`);
    process.exit(1);
  }

  // 1. Disk Folders
  const diskFolders = fs.readdirSync(rootPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`=== DISK ANALYSIS ===`);
  console.log(`Root Path: ${rootPath}`);
  console.log(`Total series folders on disk: ${diskFolders.length}`);

  // 2. Trigger scan job for TV Series
  console.log('\n=== RUNNING SCANNER FOR ROOT ===');
  await startScanJob(['tv-series-a-e']);

  let elapsed = 0;
  while (elapsed < 120) {
    await new Promise(r => setTimeout(r, 2000));
    elapsed += 2;
    const job = getCurrentScanJob();
    if (!job || job.status !== 'running') {
      console.log(`Scan completed in ${elapsed}s.`);
      break;
    }
  }

  // 3. Check DB Status
  const dbRes = await query(`
    SELECT id, title, status, metadata_status, payload->>'poster' AS poster, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
    ORDER BY status, title
  `, [`%${rootPath}%`]);

  const rows = dbRes.rows;
  const published = rows.filter(r => r.status === 'published');
  const draft = rows.filter(r => r.status === 'draft');

  console.log(`\n=== DATABASE ANALYSIS ===`);
  console.log(`Total DB entries for TV_Web_Series-0-9_A-E: ${rows.length}`);
  console.log(`- PUBLISHED: ${published.length}`);
  console.log(`- DRAFT: ${draft.length}`);

  if (draft.length > 0) {
    console.log(`\nDraft items (${draft.length}):`);
    draft.forEach(d => console.log(`  - ID:${d.id} "${d.title}"`));
  }

  process.exit(0);
}

verifyAndScanAE().catch(console.error);
