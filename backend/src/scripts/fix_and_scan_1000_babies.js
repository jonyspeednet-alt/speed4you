/**
 * fix_and_scan_1000_babies.js
 * Clean wrongly mapped sourcePaths for 1000 Babies and trigger fresh scan for this series
 */
require('dotenv').config();
const { query } = require('../config/database');
const { fetchMetadataByTmdbId, enrichItemWithMetadata } = require('../services/metadata-enricher');

async function fix1000Babies() {
  console.log('=== CREATING & FIXING "1000 Babies" IN DB ===\n');

  const targetDir = '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/1000 Babies';
  const expectedSignature = 'tv-series-a-e:1000 Babies';

  // 1. Remove corrupted sourcePath references on other items
  await query(`
    UPDATE content_catalog
    SET payload = jsonb_set(payload, '{sourcePath}', '"/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/"')
    WHERE payload->>'sourcePath' = $1
  `, [targetDir]);

  // 2. Fetch TMDB metadata for 1000 Babies (TMDB ID: 260309)
  console.log('Fetching TMDB metadata for 1000 Babies (TMDB ID: 260309)...');
  const tmdbMeta = await fetchMetadataByTmdbId(260309, 'tv');

  // Build Season 1 episode structure from disk
  const fs = require('fs');
  const path = require('path');
  const season1Path = path.join(targetDir, 'Season 01');
  let episodes = [];
  if (fs.existsSync(season1Path)) {
    const files = fs.readdirSync(season1Path).filter(f => /\.(mp4|mkv|avi|mov)$/i.test(f)).sort();
    episodes = files.map((f, i) => ({
      id: `1000-babies-s1-e${i+1}`,
      number: i + 1,
      title: f.replace(/\.[^/.]+$/, ''),
      videoUrl: `/TV_Series/TV_Web_Series-0-9_A-E/1000 Babies/Season 01/${f}`,
      sourcePath: path.join(season1Path, f)
    }));
  }

  const now = new Date().toISOString();
  const nextId = await require('../data/store/content').allocateNextCatalogId();

  const itemPayload = {
    id: nextId,
    title: '1000 Babies',
    content_type: 'series',
    type: 'series',
    status: 'published',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    sourceType: 'scanner',
    sourceRootId: 'tv-series-a-e',
    scanSignature: expectedSignature,
    sourcePath: targetDir,
    sourcePublicPath: '/TV_Series/TV_Web_Series-0-9_A-E/1000 Babies',
    seasonCount: 1,
    episodeCount: episodes.length,
    seasons: [
      {
        id: '1000-babies-season-1',
        number: 1,
        title: 'Season 1',
        episodes
      }
    ],
    ...tmdbMeta,
    metadataStatus: 'matched',
    metadataConfidence: 100,
    metadataUpdatedAt: now
  };

  // Upsert into DB
  await query(`
    INSERT INTO content_catalog
      (id, payload, created_at, updated_at, status, content_type, title, title_key, source_type, source_root_id, metadata_status, published_at)
    VALUES
      ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
  `, [
    nextId,
    JSON.stringify(itemPayload),
    now,
    now,
    'published',
    'series',
    '1000 Babies',
    '1000 babies',
    'scanner',
    'tv-series-a-e',
    'matched',
    now
  ]);

  console.log(`\n✓ SUCCESS: Created & Published "1000 Babies" (ID: ${nextId}) with ${episodes.length} episodes!`);
  process.exit(0);
}

fix1000Babies().catch(console.error);
