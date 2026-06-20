require('dotenv').config();
const { query } = require('../src/config/database');

const OMDB_KEY = process.env.OMDB_API_KEY;
const BASE = 'https://www.omdbapi.com/';

async function omdbSearch(title, type) {
  const url = `${BASE}?s=${encodeURIComponent(title)}&type=${type === 'series' ? 'series' : 'movie'}&apikey=${OMDB_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.Response === 'False' || !data.Search?.length) return null;
  return data.Search[0]; // best match
}

async function omdbById(imdbId) {
  const url = `${BASE}?i=${imdbId}&apikey=${OMDB_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.Response === 'False') return null;
  return data;
}

async function main() {
  const result = await query(
    `SELECT id, payload FROM content_catalog WHERE metadata_status IN ('not_found', 'needs_review') ORDER BY id`
  );

  let matched = 0;
  for (const row of result.rows) {
    const item = row.payload;
    const title = (item.title || '').replace(/\s*\d{4}$/, '').replace(/\s*-\s*\d+p\b.*/, '').trim();
    if (!title || title.length < 3) continue;

    // Search OMDB by title
    const searchResult = await omdbSearch(title, item.type || 'movie');
    if (!searchResult || !searchResult.imdbID) {
      console.log(`❌ ID=${row.id}: "${title}" — not on OMDB`);
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    // Fetch full metadata from OMDB
    const omdbData = await omdbById(searchResult.imdbID);
    if (!omdbData) {
      console.log(`❌ ID=${row.id}: "${title}" — OMDB fetch failed`);
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    // Update item with OMDB metadata
    const enriched = {
      ...item,
      title: omdbData.Title || item.title,
      description: omdbData.Plot !== 'N/A' ? omdbData.Plot : '',
      poster: omdbData.Poster !== 'N/A' ? omdbData.Poster : item.poster,
      backdrop: omdbData.Poster !== 'N/A' ? omdbData.Poster : item.backdrop,
      genre: omdbData.Genre !== 'N/A' ? omdbData.Genre : '',
      genres: omdbData.Genre !== 'N/A' ? omdbData.Genre.split(',').map(g => g.trim()) : [],
      rating: omdbData.imdbRating !== 'N/A' ? parseFloat(omdbData.imdbRating) : null,
      runtime: omdbData.Runtime && omdbData.Runtime !== 'N/A' ? parseInt(omdbData.Runtime, 10) : null,
      imdbId: omdbData.imdbID,
      year: parseInt(omdbData.Year, 10) || item.year,
      metadataStatus: 'matched',
      metadataProvider: 'omdb',
      metadataConfidence: 100,
      metadataUpdatedAt: new Date().toISOString(),
      metadataError: '',
    };

    await query(
      `UPDATE content_catalog
       SET payload = $2::jsonb, title = $3, metadata_status = 'matched',
           year = $4, rating = $5, updated_at = NOW()
       WHERE id = $1`,
      [row.id, JSON.stringify(enriched), enriched.title,
       enriched.year || null, enriched.rating]
    );

    console.log(`✅ ID=${row.id}: "${title}" → imdb:${omdbData.imdbID} (${omdbData.Title})`);
    matched++;
    await new Promise(r => setTimeout(r, 250)); // rate limit
  }

  console.log(`\nDone. Newly matched via OMDB: ${matched}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
