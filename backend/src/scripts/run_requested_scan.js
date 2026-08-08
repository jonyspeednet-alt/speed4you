/**
 * run_requested_scan.js
 * Scans only requested-series root properly and publishes all matched.
 */
require('dotenv').config();
const { startScanJob, getCurrentScanJob } = require('../services/scanner');
const { query } = require('../config/database');

async function run() {
  console.log('Starting requested-series scan...');
  await startScanJob(['requested-series']);

  // Poll scan completion
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 2000));
    const job = getCurrentScanJob();
    attempts++;
    if (!job || job.status !== 'running') {
      console.log(`Scan job completed. Total run time: ${attempts * 2}s`);
      break;
    }
  }

  // Auto-publish matched/needs_review
  await query(`
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

  const finalCheck = await query(`
    SELECT id, title, status, metadata_status, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE '%/Requested/Series/%'
    ORDER BY status, title
  `);

  const pub = finalCheck.rows.filter(r => r.status === 'published');
  const drf = finalCheck.rows.filter(r => r.status === 'draft');

  console.log(`\n========================================`);
  console.log(`VERIFICATION RESULT:`);
  console.log(`Total DB entries for /Requested/Series/: ${finalCheck.rows.length}/44`);
  console.log(`- PUBLISHED: ${pub.length}`);
  console.log(`- DRAFT (Metadata not found in TMDB): ${drf.length}`);
  console.log(`========================================`);

  if (drf.length > 0) {
    console.log(`\nDraft items (TMDB title not found):`);
    drf.forEach(d => console.log(`  - ID:${d.id} "${d.title}"`));
  }

  process.exit(0);
}

run().catch(console.error);
