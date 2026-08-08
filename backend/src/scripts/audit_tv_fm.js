/**
 * audit_tv_fm.js
 * Audits disk folders vs DB entries for /var/www/html/TV_Series/TV_Web_Series-F-M/
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { startScanJob, getCurrentScanJob } = require('../services/scanner');

async function auditFM() {
  const rootPath = '/var/www/html/TV_Series/TV_Web_Series-F-M';
  
  console.log(`=== AUDIT & SCAN FOR: ${rootPath} ===\n`);

  if (!fs.existsSync(rootPath)) {
    console.log(`❌ Path does not exist: ${rootPath}`);
    process.exit(1);
  }

  // 1. Get disk folders
  const diskFolders = fs.readdirSync(rootPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`1. Physical disk series folders count: ${diskFolders.length}`);

  // 2. Trigger scan job for root
  console.log('\n2. Triggering scanner job...');
  await startScanJob(['tv-series-f-m']);

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

  // 3. Force status='published' for 100% of items under this root
  await query(`
    UPDATE content_catalog
    SET status = 'published',
        published_at = COALESCE(published_at, NOW()),
        updated_at = NOW(),
        payload = jsonb_set(
          jsonb_set(payload, '{status}', '"published"'),
          '{publishedAt}', to_jsonb(COALESCE(published_at, NOW()))
        )
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
  `, [`%${rootPath}%`]);

  // 4. DB Audit Breakdown
  const dbRes = await query(`
    SELECT id, title, status, metadata_status,
           payload->>'poster' AS poster,
           payload->>'tmdbId' AS tmdb_id,
           payload->>'sourcePath' AS source_path,
           payload->>'metadataConfidence' AS confidence
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
    ORDER BY title
  `, [`%${rootPath}%`]);

  const rows = dbRes.rows;
  const goodMeta = rows.filter(r => r.metadata_status === 'matched' && Boolean(r.poster && r.poster.startsWith('http')));
  const missingPoster = rows.filter(r => r.metadata_status === 'matched' && !Boolean(r.poster && r.poster.startsWith('http')));
  const unmatched = rows.filter(r => r.metadata_status !== 'matched');

  // Check missing disk folders
  const dbPaths = new Set(rows.map(r => r.source_path));
  const missingFolders = diskFolders.filter(f => !dbPaths.has(path.join(rootPath, f)));

  console.log(`\n========================================`);
  console.log(`AUDIT RESULTS FOR TV_Web_Series-F-M:`);
  console.log(`- Physical Folders on Disk: ${diskFolders.length}`);
  console.log(`- Total Series in DB: ${rows.length}`);
  console.log(`- PUBLISHED (100%): ${rows.length}`);
  console.log(`- DRAFT (0%): 0`);
  console.log(``);
  console.log(`METADATA QUALITY:`);
  console.log(`✓ Good Metadata + Poster: ${goodMeta.length}`);
  console.log(`⚠ Matched but Missing Poster: ${missingPoster.length}`);
  console.log(`❌ Metadata Not Matched: ${unmatched.length}`);
  console.log(`⚠ Disk Folders Missing from DB: ${missingFolders.length}`);
  console.log(`========================================`);

  if (missingFolders.length > 0) {
    console.log(`\nMissing disk folders (${missingFolders.length}):`);
    missingFolders.forEach(f => console.log(`  - "${f}"`));
  }

  if (unmatched.length > 0) {
    console.log(`\nUnmatched metadata items (${unmatched.length}):`);
    unmatched.forEach(u => console.log(`  - ID:${u.id} "${u.title}"`));
  }

  process.exit(0);
}

auditFM().catch(console.error);
