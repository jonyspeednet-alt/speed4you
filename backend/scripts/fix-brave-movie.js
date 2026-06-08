require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');
const https = require('https');

const TMDB_KEY = process.env.TMDB_API_KEY;
const BRAVE_ID_IN_DB = 13967; // id=13967, title="Bravest Warriors (2012)" - actually Brave (2012)
const BRAVE_TMDB_ID = 62177; // Brave (2012) on TMDB

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  await ensureContentStore();
  
  if (!TMDB_KEY) {
    console.error('TMDB_API_KEY not set in .env');
    process.exit(1);
  }

  // Fetch Brave (2012) details from TMDB
  console.log('Fetching Brave (2012) from TMDB...');
  const movie = await httpsGet(
    `https://api.themoviedb.org/3/movie/${BRAVE_TMDB_ID}?api_key=${TMDB_KEY}&language=en-US`
  );
  console.log(`TMDB: ${movie.title} (${movie.release_date}) rating=${movie.vote_average}`);

  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '';

  // Get current payload
  const res = await db.query('SELECT id, payload FROM content_catalog WHERE id = $1 LIMIT 1', [BRAVE_ID_IN_DB]);
  if (!res.rows.length) {
    console.error(`Entry ${BRAVE_ID_IN_DB} not found in database`);
    process.exit(1);
  }

  const current = res.rows[0].payload;
  console.log(`Current: title="${current.title}" status=${current.status} scanSig=${current.scanSignature}`);

  const now = new Date().toISOString();
  const updated = {
    ...current,
    title: 'Brave',
    titleKey: 'brave',
    slug: 'brave-2012',
    year: 2012,
    description: movie.overview || '',
    genres: (movie.genres || []).map(g => g.name),
    rating: movie.vote_average || 0,
    poster: posterUrl || current.poster,
    backdrop: backdropUrl || current.backdrop,
    tmdbId: String(BRAVE_TMDB_ID),
    imdbId: movie.imdb_id || '',
    metadataStatus: 'matched',
    metadataProvider: 'tmdb',
    metadataConfidence: 1,
    metadataUpdatedAt: now,
    originalTitle: movie.original_title || 'Brave',
    originalLanguage: movie.original_language || 'en',
    status: 'published',
    publishedAt: now,
    updatedAt: now,
  };

  await db.query(
    `UPDATE content_catalog
     SET payload = $2::jsonb,
         updated_at = NOW(),
         status = 'published',
         title = $3,
         title_key = $4,
         year = $5,
         rating = $6,
         metadata_status = 'matched',
         published_at = $7
     WHERE id = $1`,
    [BRAVE_ID_IN_DB, JSON.stringify(updated), 'Brave', 'brave', 2012, movie.vote_average || 0, now]
  );

  console.log('\n✅ Brave (2012) fixed and published!');
  console.log(`   Title: ${updated.title}`);
  console.log(`   Year: ${updated.year}`);
  console.log(`   Rating: ${updated.rating}`);
  console.log(`   Status: ${updated.status}`);
  console.log(`   TMDB ID: ${updated.tmdbId}`);
  console.log(`   Poster: ${updated.poster}`);
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
