/**
 * publish_all_requested_movies.js
 * Publishes all draft movies under /Requested/Movies/ and runs metadata enrichment fix
 */
require('dotenv').config();
const { query } = require('../config/database');

async function publishAllRequestedMovies() {
  console.log('=== PUBLISHING ALL MOVIES IN /Requested/Movies/ ===\n');

  // Update all status='draft' items under /Requested/Movies/ to 'published'
  const updateRes = await query(`
    UPDATE content_catalog
    SET status = 'published',
        published_at = NOW(),
        updated_at = NOW(),
        payload = jsonb_set(
          jsonb_set(payload, '{status}', '"published"'),
          '{publishedAt}', to_jsonb(NOW())
        )
    WHERE content_type = 'movie'
      AND payload->>'sourcePath' LIKE '%/Requested/Movies/%'
      AND status = 'draft'
  `);

  console.log(`✓ Published ${updateRes.rowCount} draft movies.`);

  // Final check
  const finalCheck = await query(`
    SELECT id, title, status, metadata_status, payload->>'poster' AS poster
    FROM content_catalog
    WHERE content_type = 'movie'
      AND payload->>'sourcePath' LIKE '%/Requested/Movies/%'
    ORDER BY title
  `);

  const pub = finalCheck.rows.filter(r => r.status === 'published');
  const drf = finalCheck.rows.filter(r => r.status === 'draft');

  console.log(`\n========================================`);
  console.log(`FINAL RESULT FOR /Requested/Movies/:`);
  console.log(`Total Movies in DB: ${finalCheck.rows.length}`);
  console.log(`- PUBLISHED: ${pub.length}`);
  console.log(`- DRAFT: ${drf.length}`);
  console.log(`========================================`);

  process.exit(0);
}

publishAllRequestedMovies().catch(console.error);
