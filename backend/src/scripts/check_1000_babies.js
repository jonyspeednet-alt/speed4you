/**
 * check_1000_babies.js
 * Check if 1000 Babies exists in DB, check episode count and metadata
 */
require('dotenv').config();
const { query } = require('../config/database');

async function checkBabies() {
  console.log('=== CHECKING "1000 Babies" IN DB ===\n');

  const res = await query(`
    SELECT id, title, content_type, status, metadata_status,
           payload->>'poster' AS poster,
           payload->>'sourcePath' AS source_path,
           payload->'seasons' AS seasons,
           payload->>'seasonCount' AS season_count,
           payload->>'episodeCount' AS episode_count
    FROM content_catalog
    WHERE title ILIKE '%1000 Babies%' OR payload->>'sourcePath' ILIKE '%1000 Babies%'
  `);

  if (!res.rows.length) {
    console.log('❌ "1000 Babies" was NOT found in DB!');
  } else {
    for (const r of res.rows) {
      console.log(`✓ ID: ${r.id} | Title: "${r.title}" | Status: ${r.status}`);
      console.log(`  SourcePath: ${r.source_path}`);
      console.log(`  Seasons: ${r.season_count}, Episodes: ${r.episode_count}`);
      console.log(`  Poster: ${Boolean(r.poster)}`);
      
      const seasons = typeof r.seasons === 'string' ? JSON.parse(r.seasons) : r.seasons;
      if (Array.isArray(seasons)) {
        seasons.forEach(s => {
          console.log(`  -> Season ${s.number || s.id}: ${s.episodes?.length || 0} episodes`);
        });
      }
    }
  }

  process.exit(0);
}

checkBabies().catch(console.error);
