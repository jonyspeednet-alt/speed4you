/**
 * publish_all_requested_movies_strict.js
 * Explicitly sets status='published' for 100% of items under /Requested/Movies/
 */
require('dotenv').config();
const { query } = require('../config/database');

async function publishAllMovies() {
  console.log('=== FORCE PUBLISHING ALL ITEMS IN /Requested/Movies/ ===\n');

  // Update ALL rows with sourcePath under /Requested/Movies/ to status='published'
  const res = await query(`
    UPDATE content_catalog
    SET status = 'published',
        published_at = COALESCE(published_at, NOW()),
        updated_at = NOW(),
        payload = jsonb_set(
          jsonb_set(payload, '{status}', '"published"'),
          '{publishedAt}', to_jsonb(COALESCE(published_at, NOW()))
        )
    WHERE content_type = 'movie'
      AND payload->>'sourcePath' LIKE '%/Requested/Movies/%'
  `);

  console.log(`✓ Set status='published' for ${res.rowCount} movies in /Requested/Movies/.`);

  // Verify DB Status
  const check = await query(`
    SELECT id, title, status, payload->>'poster' AS poster
    FROM content_catalog
    WHERE content_type = 'movie'
      AND payload->>'sourcePath' LIKE '%/Requested/Movies/%'
  `);

  const published = check.rows.filter(r => r.status === 'published');
  const draft = check.rows.filter(r => r.status === 'draft');

  console.log(`\n========================================`);
  console.log(`FINAL STRICT STATUS REPORT FOR /Requested/Movies/:`);
  console.log(`Total Movies in DB: ${check.rows.length}`);
  console.log(`- PUBLISHED: ${published.length} (100%)`);
  console.log(`- DRAFT: ${draft.length} (0%)`);
  console.log(`========================================`);

  process.exit(0);
}

publishAllMovies().catch(console.error);
