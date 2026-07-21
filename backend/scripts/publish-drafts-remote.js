require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const https = require('https');

const TMDB_KEY = process.env.TMDB_API_KEY;

// Try to connect to the production database
const pool = new Pool({
  host: process.env.DEPLOY_HOST || process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 10000,
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

async function searchTMDB(title, year = null) {
  try {
    let query = encodeURIComponent(title);
    let url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${query}&language=en-US`;
    if (year) url += `&year=${year}`;
    
    const result = await httpsGet(url);
    if (result.results && result.results.length > 0) {
      return result.results[0];
    }
    return null;
  } catch (error) {
    console.error(`TMDB search error for "${title}":`, error.message);
    return null;
  }
}

async function main() {
  let client;
  try {
    console.log('=== CONNECTING TO DATABASE ===');
    console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}\n`);

    client = await pool.connect();
    console.log('✅ Connected to database\n');

    const now = new Date().toISOString();

    console.log('=== LOADING ALL DRAFT ITEMS ===\n');

    // Get all draft items
    const draftsResult = await client.query(
      `SELECT id, 
              payload->>'title' as title, 
              payload->>'type' as content_type,
              payload->>'year' as yr, 
              payload->>'sourceRootId' as root_id,
              payload->>'sourcePath' as src_path,
              payload->>'videoUrl' as video_url,
              payload->>'metadataStatus' as meta_status,
              payload->>'category' as cat,
              payload->>'language' as lang,
              payload->>'poster' as poster,
              payload->>'backdrop' as backdrop,
              payload->>'description' as description,
              payload->>'tmdbId' as tmdb_id,
              payload
       FROM content_catalog 
       WHERE status = 'draft' 
       ORDER BY id ASC`
    );

    const drafts = draftsResult.rows;
    console.log(`Found ${drafts.length} draft items\n`);

    if (drafts.length === 0) {
      console.log('No draft items found to process.');
      return;
    }

    let publishedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const draft of drafts) {
      console.log(`\n--- Processing ID ${draft.id}: ${draft.title || 'No title'} ---`);
      
      try {
        const payload = draft.payload;
        const title = draft.title || 'Untitled';
        const year = draft.yr ? parseInt(draft.yr) : null;
        const contentType = draft.content_type || 'movie';

        // Check if has basic required info
        if (!title || title.trim() === '') {
          console.log(`  ⚠️  Skipping: No title`);
          skippedCount++;
          continue;
        }

        // Try to fetch metadata from TMDB if not already matched
        let tmdbData = null;
        if (draft.meta_status !== 'matched' && !draft.tmdb_id) {
          console.log(`  🔍 Searching TMDB for "${title}"...`);
          tmdbData = await searchTMDB(title, year);
          
          if (tmdbData) {
            console.log(`  ✅ TMDB found: ${tmdbData.title || tmdbData.name} (${tmdbData.release_date || tmdbData.first_air_date})`);
            
            // Update payload with TMDB data
            const posterUrl = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : payload.poster;
            const backdropUrl = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : payload.backdrop;
            
            payload.title = tmdbData.title || tmdbData.name || title;
            payload.titleKey = (tmdbData.title || tmdbData.name || title).toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
            payload.slug = payload.titleKey.replace(/\s+/g, '-');
            payload.year = tmdbData.release_date ? parseInt(tmdbData.release_date.substring(0, 4)) : 
                         tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.substring(0, 4)) : year;
            payload.description = tmdbData.overview || payload.description;
            payload.rating = tmdbData.vote_average || payload.rating;
            payload.poster = posterUrl;
            payload.backdrop = backdropUrl;
            payload.tmdbId = String(tmdbData.id);
            payload.metadataStatus = 'matched';
            payload.metadataProvider = 'tmdb';
            payload.metadataConfidence = 0.8;
            payload.metadataUpdatedAt = now;
            
            // Set category based on language if not set
            if (!payload.category && payload.language) {
              if (payload.language.toLowerCase().includes('bn') || payload.language.toLowerCase().includes('bengali')) {
                payload.category = 'Bangla Movies';
              } else if (payload.language.toLowerCase().includes('hi') || payload.language.toLowerCase().includes('hindi')) {
                payload.category = 'Hindi Movies';
              } else if (payload.language.toLowerCase().includes('en') || payload.language.toLowerCase().includes('english')) {
                payload.category = 'English Movies';
              }
            }
          } else {
            console.log(`  ❌ No TMDB match found`);
            payload.metadataStatus = 'not_found';
          }
        }

        // Set default category if still not set
        if (!payload.category) {
          payload.category = 'Uncategorized';
        }

        // Update status to published
        payload.status = 'published';
        payload.publishedAt = now;
        payload.updatedAt = now;

        // Update database
        await client.query(
          `UPDATE content_catalog 
           SET payload = $2::jsonb, 
               status = 'published', 
               published_at = $3, 
               updated_at = NOW(),
               title = $4,
               category = $5,
               metadata_status = $6
           WHERE id = $1`,
          [draft.id, JSON.stringify(payload), now, payload.title, payload.category, payload.metadataStatus]
        );

        console.log(`  ✅ Published: ${payload.title}`);
        publishedCount++;

      } catch (error) {
        console.error(`  ❌ Failed to process ID ${draft.id}:`, error.message);
        failedCount++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total drafts processed: ${drafts.length}`);
    console.log(`Successfully published: ${publishedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Skipped: ${skippedCount}`);

    // Verify remaining drafts
    const remainingResult = await client.query("SELECT COUNT(*) as cnt FROM content_catalog WHERE status = 'draft'");
    console.log(`Remaining drafts: ${remainingResult.rows[0].cnt}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main().catch(err => { 
  console.error('Fatal error:', err); 
  process.exit(1); 
});