require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');
const https = require('https');

const TMDB_KEY = process.env.TMDB_API_KEY;

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
  const now = new Date().toISOString();

  // ============================================
  // STEP 1: Delete series episodes wrongly added as movies
  // These are individual S01E01, S01E02, etc. files in New_Movies_1
  // ============================================
  console.log('=== STEP 1: Delete misidentified series episodes ===');

  // IDs of series episodes wrongly in movies
  const episodeIds = [];

  // Kuheli S01E01-E07 (ids 5614-5620)
  for (let i = 5614; i <= 5620; i++) episodeIds.push(i);
  // Lukkhe S01E01-E08 (ids 5621-5628)
  for (let i = 5621; i <= 5628; i++) episodeIds.push(i);
  // Matka King S01E01-E08 (ids 5629-5636)
  for (let i = 5629; i <= 5636; i++) episodeIds.push(i);
  // Muthu Alias Kaattaan S01E01-E10 (ids 5637-5646)
  for (let i = 5637; i <= 5646; i++) episodeIds.push(i);

  const delResult = await db.query(
    "DELETE FROM content_catalog WHERE id = ANY($1::int[]) AND status = 'draft'",
    [episodeIds]
  );
  console.log(`  Deleted ${delResult.rowCount} misidentified episode entries\n`);

  // ============================================
  // STEP 2: Fix and publish Bangla movies
  // ============================================
  console.log('=== STEP 2: Fix Bangla movies ===');

  // --- Domm (id=13406) ---
  console.log('  Fixing "Domm: Until the Last Breath"...');
  // Search TMDB for this Bengali movie
  const dommSearch = await httpsGet(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=Domm+Until+the+Last+Breath&language=en-US`
  );
  if (dommSearch.results && dommSearch.results.length > 0) {
    const dommTmdb = dommSearch.results[0];
    console.log(`  TMDB found: ${dommTmdb.title} (${dommTmdb.release_date})`);
    const posterUrl = dommTmdb.poster_path ? `https://image.tmdb.org/t/p/w500${dommTmdb.poster_path}` : '';
    const backdropUrl = dommTmdb.backdrop_path ? `https://image.tmdb.org/t/p/w1280${dommTmdb.backdrop_path}` : '';
    
    const dommRow = await db.query('SELECT payload FROM content_catalog WHERE id = 13406');
    if (dommRow.rows.length) {
      const current = dommRow.rows[0].payload;
      const updated = {
        ...current,
        title: dommTmdb.title || 'Domm: Until the Last Breath',
        titleKey: 'domm until the last breath',
        slug: 'domm-until-the-last-breath',
        year: dommTmdb.release_date ? parseInt(dommTmdb.release_date.substring(0, 4)) : null,
        description: dommTmdb.overview || '',
        rating: dommTmdb.vote_average || 0,
        poster: posterUrl || current.poster,
        backdrop: backdropUrl || current.backdrop,
        tmdbId: String(dommTmdb.id),
        metadataStatus: 'matched',
        metadataProvider: 'tmdb',
        metadataConfidence: 0.8,
        metadataUpdatedAt: now,
        category: 'Bangla Movies',
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      };
      await db.query(
        `UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW(), status = 'published', 
         title = $3, metadata_status = 'matched', published_at = $4, category = 'Bangla Movies'
         WHERE id = $1`,
        [13406, JSON.stringify(updated), updated.title, now]
      );
      console.log(`  ✅ Domm published\n`);
    }
  } else {
    // No TMDB match - publish with basic info
    console.log('  No TMDB match, publishing with basic info...');
    await db.query(
      `UPDATE content_catalog SET status = 'published', published_at = $2, updated_at = NOW(),
       metadata_status = 'not_found', category = 'Bangla Movies'
       WHERE id = $1`,
      [13406, now]
    );
    // Also update payload
    const dommRow = await db.query('SELECT payload FROM content_catalog WHERE id = 13406');
    if (dommRow.rows.length) {
      const updated = { ...dommRow.rows[0].payload, status: 'published', publishedAt: now, category: 'Bangla Movies', title: 'Domm: Until the Last Breath', updatedAt: now };
      await db.query('UPDATE content_catalog SET payload = $2::jsonb WHERE id = $1', [13406, JSON.stringify(updated)]);
    }
    console.log(`  ✅ Domm published (no TMDB match)\n`);
  }

  // --- Rakkhosh (id=13407) - already has metadata matched ---
  console.log('  Fixing "Rakkhosh"...');
  const rakkRow = await db.query('SELECT payload FROM content_catalog WHERE id = 13407');
  if (rakkRow.rows.length) {
    const current = rakkRow.rows[0].payload;
    const updated = {
      ...current,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
      category: 'Bangla Movies',
    };
    await db.query(
      `UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW(), status = 'published',
       published_at = $3, category = 'Bangla Movies'
       WHERE id = $1`,
      [13407, JSON.stringify(updated), now]
    );
    console.log(`  ✅ Rakkhosh published\n`);
  }

  // ============================================
  // STEP 3: Verify
  // ============================================
  const remaining = await db.query("SELECT COUNT(*) as cnt FROM content_catalog WHERE status = 'draft'");
  console.log(`=== RESULT ===`);
  console.log(`  Remaining drafts: ${remaining.rows[0].cnt}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
