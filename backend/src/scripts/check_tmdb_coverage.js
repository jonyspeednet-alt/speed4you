require('dotenv').config();
const { query } = require('../config/database');

async function main() {
  const res = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE payload->>'tmdbId' IS NOT NULL 
                         AND payload->>'tmdbId' != 'null' 
                         AND payload->>'tmdbId' != '') AS with_tmdb,
      count(*) FILTER (WHERE payload->>'imdbId' IS NOT NULL 
                         AND payload->>'imdbId' != 'null' 
                         AND payload->>'imdbId' != '') AS with_imdb,
      count(*) FILTER (WHERE (payload->>'tmdbId' IS NULL OR payload->>'tmdbId' = 'null' OR payload->>'tmdbId' = '')
                         AND metadata_status = 'matched') AS matched_but_no_tmdb
    FROM content_catalog
    WHERE source_type = 'scanner'
  `);
  const s = res.rows[0];
  console.log('=== TMDB / IMDB ID COVERAGE ===');
  console.log(`Total scanner items  : ${s.total}`);
  console.log(`With tmdbId          : ${s.with_tmdb} (${Math.round(s.with_tmdb / s.total * 100)}%)`);
  console.log(`With imdbId          : ${s.with_imdb} (${Math.round(s.with_imdb / s.total * 100)}%)`);
  console.log(`Matched but no tmdbId: ${s.matched_but_no_tmdb}`);

  // Show a few samples of matched but missing tmdbId
  if (parseInt(s.matched_but_no_tmdb) > 0) {
    const samples = await query(`
      SELECT id, title, metadata_status, payload->>'tmdbId' AS tmdb_id, payload->>'imdbId' AS imdb_id
      FROM content_catalog
      WHERE source_type = 'scanner'
        AND metadata_status = 'matched'
        AND (payload->>'tmdbId' IS NULL OR payload->>'tmdbId' = 'null' OR payload->>'tmdbId' = '')
      LIMIT 10
    `);
    console.log('\nSamples (matched but no tmdbId):');
    for (const r of samples.rows) {
      console.log(`  ID:${r.id} "${r.title}" tmdb:${r.tmdb_id} imdb:${r.imdb_id}`);
    }
  }

  process.exit(0);
}
main().catch(console.error);
