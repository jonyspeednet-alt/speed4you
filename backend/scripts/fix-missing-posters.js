// fix-missing-posters.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const https = require('https');
const { db, ensureContentStore } = require('../src/data/store/base');

const TMDB_KEY = process.env.TMDB_API_KEY;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Helper to build TMDB search URL
function tmdbSearchUrl(query) {
  const encoded = encodeURIComponent(query);
  return `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encoded}&language=en-US`;
}

async function enrichItem(item) {
  const title = item.title || '';
  if (!title) return null;
  const search = await httpsGet(tmdbSearchUrl(title));
  if (!search.results || !search.results.length) return null;
  const tmdb = search.results[0];
  const poster = tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : '';
  const backdrop = tmdb.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdb.backdrop_path}` : '';
  const year = tmdb.release_date ? parseInt(tmdb.release_date.substring(0, 4)) : null;
  const description = tmdb.overview || '';
  const rating = tmdb.vote_average || 0;
  return { poster, backdrop, year, description, rating, tmdbId: String(tmdb.id), tmdbTitle: tmdb.title };
}

async function main() {
  await ensureContentStore();
  const now = new Date().toISOString();

  // Find published items missing key media or metadata fields
  const res = await db.query(`
    SELECT id, payload
    FROM content_catalog
    WHERE status = 'published'
      AND (
        payload->>'poster' IS NULL OR payload->>'poster' = '' OR
        payload->>'backdrop' IS NULL OR payload->>'backdrop' = '' OR
        payload->>'description' IS NULL OR payload->>'description' = '' OR
        payload->>'year' IS NULL
      )
  `);

  console.log(`Found ${res.rowCount} items needing enrichment`);
  for (const row of res.rows) {
    const id = row.id;
    const payload = row.payload;
    const needs = [];
    if (!payload.poster) needs.push('poster');
    if (!payload.backdrop) needs.push('backdrop');
    if (!payload.description) needs.push('description');
    if (!payload.year) needs.push('year');
    console.log(`Processing id=${id}, missing: ${needs.join(', ')}`);
    try {
      const enrich = await enrichItem(payload);
      if (!enrich) {
        console.log(`  No TMDB match for title "${payload.title}"`);
        continue;
      }
      const updated = {
        ...payload,
        poster: payload.poster || enrich.poster,
        backdrop: payload.backdrop || enrich.backdrop,
        description: payload.description || enrich.description,
        year: payload.year || enrich.year,
        rating: payload.rating || enrich.rating,
        tmdbId: payload.tmdbId || enrich.tmdbId,
        metadataStatus: 'matched',
        metadataProvider: 'tmdb',
        metadataConfidence: 0.9,
        metadataUpdatedAt: now,
        updatedAt: now,
      };
      await db.query(
        `UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [id, JSON.stringify(updated)]
      );
      console.log(`  ✅ Updated id=${id}`);
    } catch (e) {
      console.error(`  ❌ Error updating id=${id}:`, e.message);
    }
  }
  console.log('Enrichment complete');
  process.exit(0);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
