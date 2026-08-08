/**
 * thorough_audit_tv_ae.js
 * Performs 100% complete audit comparing physical disk folders vs DB entries for /TV_Series/TV_Web_Series-0-9_A-E/
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function audit() {
  const rootDir = '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E';
  
  console.log(`=== THOROUGH AUDIT: DISK VS DB FOR ${rootDir} ===\n`);

  if (!fs.existsSync(rootDir)) {
    console.log('❌ Directory does not exist on disk!');
    process.exit(1);
  }

  // 1. Get physical folders on disk
  const diskFolders = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`1. PHYSICAL DISK FOLDERS COUNT: ${diskFolders.length}`);

  // 2. Fetch all DB rows for this root
  const dbRes = await query(`
    SELECT id, title, status, metadata_status,
           payload->>'poster' AS poster,
           payload->>'tmdbId' AS tmdb_id,
           payload->>'imdbId' AS imdb_id,
           payload->>'sourcePath' AS source_path,
           payload->>'metadataConfidence' AS confidence,
           payload->>'seasonCount' AS season_count,
           payload->>'episodeCount' AS episode_count
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
  `, [`%${rootDir}%`]);

  const dbRows = dbRes.rows;
  console.log(`2. TOTAL DB ENTRIES MATCHING PATH: ${dbRows.length}`);

  // Breakdown DB rows by metadata quality
  const withGoodMetadata = []; // Has poster AND valid tmdbId/imdbId
  const withMissingPoster = []; // Matched but missing poster
  const noMetadataMatch = [];   // metadata_status = 'not_found' or no tmdbId
  const draftStatus = [];

  const dbPathMap = new Map();
  dbRows.forEach(r => {
    dbPathMap.set(r.source_path, r);

    if (r.status === 'draft') {
      draftStatus.push(r);
    }

    const hasPoster = Boolean(r.poster && r.poster.startsWith('http'));
    const hasMediaId = Boolean(r.tmdb_id || r.imdb_id);

    if (hasPoster && hasMediaId && r.metadata_status === 'matched') {
      withGoodMetadata.push(r);
    } else if (r.metadata_status === 'matched' && !hasPoster) {
      withMissingPoster.push(r);
    } else {
      noMetadataMatch.push(r);
    }
  });

  // 3. Find Disk Folders that have NO entry in DB at all
  const missingFromDb = [];
  diskFolders.forEach(folderName => {
    const fullPath = path.join(rootDir, folderName);
    if (!dbPathMap.has(fullPath)) {
      missingFromDb.push(folderName);
    }
  });

  console.log(`\n========================================`);
  console.log(`AUDIT RESULTS FOR TV_Web_Series-0-9_A-E:`);
  console.log(`- Physical Folders on Disk: ${diskFolders.length}`);
  console.log(`- Total DB Records: ${dbRows.length}`);
  console.log(`- Published in DB: ${dbRows.length - draftStatus.length}`);
  console.log(`- Draft in DB: ${draftStatus.length}`);
  console.log(``);
  console.log(`METADATA QUALITY BREAKDOWN:`);
  console.log(`✓ 1. Correct Metadata + Poster (100% Complete): ${withGoodMetadata.length}`);
  console.log(`⚠ 2. Matched TMDB ID but Missing Poster: ${withMissingPoster.length}`);
  console.log(`❌ 3. Metadata Not Found / Failed Match: ${noMetadataMatch.length}`);
  console.log(`⚠ 4. Disk Folders NOT IN DB at all: ${missingFromDb.length}`);
  console.log(`========================================`);

  if (missingFromDb.length > 0) {
    console.log(`\nFolders on Disk Missing from DB (${missingFromDb.length}):`);
    missingFromDb.forEach(f => console.log(`  - "${f}"`));
  }

  if (noMetadataMatch.length > 0) {
    console.log(`\nItems with Metadata NOT FOUND in TMDB/IMDb (${noMetadataMatch.length}):`);
    noMetadataMatch.slice(0, 30).forEach(r => console.log(`  - ID:${r.id} "${r.title}" (metaStatus: ${r.metadata_status}, conf: ${r.confidence})`));
  }

  process.exit(0);
}

audit().catch(console.error);
