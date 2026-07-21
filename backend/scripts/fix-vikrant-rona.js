require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const https = require('https');

const TMDB_KEY = process.env.TMDB_API_KEY;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  allowExitOnIdle: false,
});

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
  const client = await pool.connect();
  const now = new Date().toISOString();

  try {
    console.log('=== FIXING VIKRANT RONA (ID: 28004) ===\n');

    // Get current item
    const result = await client.query('SELECT id, payload FROM content_catalog WHERE id = 28004');
    const item = result.rows[0];
    
    if (!item) {
      console.log('Item not found');
      return;
    }

    console.log('Current title:', item.payload.title);
    console.log('Current metadata status:', item.payload.metadataStatus);

    // Fetch TMDB data directly using known ID
    const tmdbId = '680334';
    console.log(`\nFetching TMDB data for ID: ${tmdbId}`);
    
    const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`;
    const tmdbData = await httpsGet(tmdbUrl);
    
    console.log('TMDB found:', tmdbData.title, `(${tmdbData.release_date})`);

    // Update payload
    const payload = item.payload;
    const posterUrl = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : payload.poster;
    const backdropUrl = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : payload.backdrop;
    
    payload.title = tmdbData.title || payload.title;
    payload.titleKey = (tmdbData.title || payload.title).toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    payload.slug = payload.titleKey.replace(/\s+/g, '-');
    payload.year = tmdbData.release_date ? parseInt(tmdbData.release_date.substring(0, 4)) : payload.year;
    payload.description = tmdbData.overview || payload.description;
    payload.rating = tmdbData.vote_average || payload.rating;
    payload.poster = posterUrl;
    payload.backdrop = backdropUrl;
    payload.tmdbId = String(tmdbData.id);
    payload.metadataStatus = 'matched';
    payload.metadataProvider = 'tmdb';
    payload.metadataConfidence = 1.0;
    payload.metadataUpdatedAt = now;
    payload.metadataError = '';
    payload.originalTitle = tmdbData.original_title || payload.originalTitle;
    payload.originalLanguage = tmdbData.original_language || payload.originalLanguage;
    
    // Set category based on language
    if (tmdbData.original_language === 'kn') {
      payload.category = 'Kannada Movies';
      payload.language = 'Kannada';
    }

    // Update database
    await client.query(
      `UPDATE content_catalog 
       SET payload = $2::jsonb, 
           updated_at = NOW(),
           title = $3,
           metadata_status = 'matched'
       WHERE id = $1`,
      [item.id, JSON.stringify(payload), payload.title]
    );

    console.log(`\n✅ Successfully updated metadata for: ${payload.title}`);
    console.log(`   TMDB ID: ${payload.tmdbId}`);
    console.log(`   Year: ${payload.year}`);
    console.log(`   Category: ${payload.category}`);
    console.log(`   Language: ${payload.language}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { 
  console.error('Fatal error:', err); 
  process.exit(1); 
});