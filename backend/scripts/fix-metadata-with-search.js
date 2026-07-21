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

// Function to clean up titles
function cleanTitle(title) {
  if (!title) return '';
  
  // Remove common suffixes and patterns
  const patternsToRemove = [
    /WEB HDHub$/i,
    /Ag$/i,
    /JHS$/i,
    /MAX WEB DL DDP5 1 NTb$/i,
    /Season \d+ \d{4}$/i,
    /S\d+$/i,
    /COMPLETE$/i,
    /720 Blu Ray DD1 0 Nor TV$/i,
    /HOU Leon345$/i,
    /3D$/i,
    /Br Rip$/i,
    /Hindi Dubbed$/i,
    /HD English$/i,
    /HD$/i,
    /Not Dubbed$/i,
    /Bangla$/i,
    /Telugu1080PAha WEBRi Px265DD5 1HEVCESUB$/i,
    /Hindi2160PZEE5WEB DLDDP5 1HEVCESUB Telly$/i,
    /TV Movie \d{4}$/i,
    /OLD$/i,
    /S\d+$/i,
    /\d{4}$/i, // Remove standalone year at end
  ];
  
  let cleaned = title;
  patternsToRemove.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '').trim();
  });
  
  // Fix spacing issues
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

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
  const client = await pool.connect();
  const now = new Date().toISOString();

  try {
    console.log('=== FIXING METADATA FOR UNMATCHED ITEMS ===\n');

    const unmatchedResult = await client.query(`
      SELECT id, payload->>'title' as title, payload->>'year' as yr, payload->>'metadataStatus' as meta_status, payload
      FROM content_catalog 
      WHERE payload->>'metadataStatus' = 'not_found'
      ORDER BY id ASC
      LIMIT 50
    `);

    const unmatchedItems = unmatchedResult.rows;
    console.log(`Found ${unmatchedItems.length} unmatched items\n`);

    if (unmatchedItems.length === 0) {
      console.log('No unmatched items found.');
      return;
    }

    let fixedCount = 0;
    let failedCount = 0;

    for (const item of unmatchedItems) {
      console.log(`\n--- Processing ID ${item.id}: ${item.title} ---`);
      
      try {
        const payload = item.payload;
        const originalTitle = item.title || 'Untitled';
        const year = item.yr ? parseInt(item.yr) : null;

        // Clean the title
        const cleanedTitle = cleanTitle(originalTitle);
        console.log(`  Original: "${originalTitle}"`);
        console.log(`  Cleaned: "${cleanedTitle}"`);

        if (!cleanedTitle || cleanedTitle.length < 2) {
          console.log(`  ⚠️  Skipping: Title too short after cleaning`);
          failedCount++;
          continue;
        }

        // Try to search with cleaned title
        console.log(`  🔍 Searching TMDB for "${cleanedTitle}"...`);
        let tmdbData = await searchTMDB(cleanedTitle, year);
        
        // If not found, try with original title
        if (!tmdbData && cleanedTitle !== originalTitle) {
          console.log(`  🔍 Trying with original title...`);
          tmdbData = await searchTMDB(originalTitle, year);
        }
        
        // If still not found, try without year
        if (!tmdbData && year) {
          console.log(`  🔍 Trying without year...`);
          tmdbData = await searchTMDB(cleanedTitle, null);
        }
        
        if (tmdbData) {
          console.log(`  ✅ TMDB found: ${tmdbData.title || tmdbData.name} (${tmdbData.release_date || tmdbData.first_air_date})`);
          
          const posterUrl = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : payload.poster;
          const backdropUrl = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : payload.backdrop;
          
          payload.title = tmdbData.title || tmdbData.name || cleanedTitle;
          payload.titleKey = (tmdbData.title || tmdbData.name || cleanedTitle).toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
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

          console.log(`  ✅ Updated metadata for: ${payload.title}`);
          fixedCount++;

        } else {
          console.log(`  ❌ No TMDB match found for: "${cleanedTitle}"`);
          failedCount++;
        }

      } catch (error) {
        console.error(`  ❌ Failed to process ID ${item.id}:`, error.message);
        failedCount++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total unmatched items processed: ${unmatchedItems.length}`);
    console.log(`Successfully fixed: ${fixedCount}`);
    console.log(`Failed: ${failedCount}`);

    // Check remaining unmatched
    const remainingResult = await client.query("SELECT COUNT(*) as cnt FROM content_catalog WHERE payload->>'metadataStatus' = 'not_found'");
    console.log(`Remaining unmatched: ${remainingResult.rows[0].cnt}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { 
  console.error('Fatal error:', err); 
  process.exit(1); 
});