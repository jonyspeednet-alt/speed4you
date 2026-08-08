/**
 * rescan_and_publish_all.js
 * Scans requested-series root completely and auto-publishes all found series.
 */
require('dotenv').config();
const { startScanJob, getCurrentScanJob } = require('../services/scanner');
const { query } = require('../config/database');

async function rescanAll() {
  console.log('=== RESCANNING ALL REQUESTED SERIES ===\n');

  // Trigger scan
  await startScanJob(['requested-series']);

  // Wait for scan completion
  let elapsed = 0;
  while (elapsed < 90) {
    await new Promise(r => setTimeout(r, 2000));
    elapsed += 2;
    const job = getCurrentScanJob();
    if (!job || job.status !== 'running') {
      console.log(`Scan completed in ${elapsed} seconds.`);
      break;
    }
  }

  // Set all series under /Requested/Series/ to published status
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
  `);

  console.log(`Published total: ${updateRes.rowCount} series.`);

  // Final DB Check
  const check = await query(`
    SELECT id, title, status, payload->>'poster' AS poster, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE '%/Requested/Series/%'
    ORDER BY title
  `);

  const pub = check.rows.filter(r => r.status === 'published');
  const drf = check.rows.filter(r => r.status === 'draft');

  console.log(`\n========================================`);
  console.log(`FINAL REPORT FOR /Requested/Series/:`);
  console.log(`Total series in DB: ${check.rows.length}`);
  console.log(`- PUBLISHED: ${pub.length}`);
  console.log(`- DRAFT: ${drf.length}`);
  console.log(`========================================`);

  process.exit(0);
}

rescanAll().catch(console.error);
