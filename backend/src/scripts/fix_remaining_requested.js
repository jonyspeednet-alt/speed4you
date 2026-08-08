/**
 * fix_remaining_requested.js
 * Trigger scan via startScanJob and publish matched items.
 */
require('dotenv').config();
const { query } = require('../config/database');
const { startScanJob, getCurrentScanJob } = require('../services/scanner');

async function fixRemaining() {
  console.log('=== FIXING REMAINING REQUESTED SERIES ===\n');

  // 1. Run scanner job for roots
  console.log('1. Triggering full scanner job...');
  await startScanJob(['requested-series']);

  // Wait until scan job finishes
  while (true) {
    const job = getCurrentScanJob();
    if (!job || job.status !== 'running') {
      console.log(`Scan job finished with status: ${job?.status || 'idle'}`);
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  // 2. Publish matched/needs_review items
  console.log('\n2. Auto-publishing matched items...');
  const updateRes = await query(`
    UPDATE content_catalog
    SET status = 'published',
        published_at = NOW(),
        updated_at = NOW(),
        payload = jsonb_set(
          jsonb_set(payload, '{status}', '"published"'),
          '{publishedAt}', to_jsonb(NOW())
        )
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE '%/Requested/Series/%'
      AND status = 'draft'
      AND metadata_status IN ('matched', 'needs_review')
  `);
  console.log(`Updated ${updateRes.rowCount} items to published.`);

  // 3. Final summary check
  const finalCheck = await query(`
    SELECT id, title, status, metadata_status, payload->>'poster' AS poster, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE '%/Requested/Series/%'
    ORDER BY status, title
  `);

  const pub = finalCheck.rows.filter(r => r.status === 'published');
  const drf = finalCheck.rows.filter(r => r.status === 'draft');

  console.log(`\n========================================`);
  console.log(`FINAL RESULT FOR /Requested/Series/:`);
  console.log(`Total in DB: ${finalCheck.rows.length}/44`);
  console.log(`- PUBLISHED: ${pub.length}`);
  console.log(`- DRAFT (Metadata not found in TMDB): ${drf.length}`);
  console.log(`========================================`);

  if (drf.length > 0) {
    console.log(`\nDraft items (TMDB search couldn't find metadata for these exact names):`);
    drf.forEach(d => console.log(`  - ID:${d.id} "${d.title}"`));
  }

  process.exit(0);
}

fixRemaining().catch(console.error);
