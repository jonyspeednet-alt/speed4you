/**
 * fix_tv_ae_all_published.js
 * Sets status='published' for 100% of TV series in /TV_Series/TV_Web_Series-0-9_A-E/
 */
require('dotenv').config();
const { query } = require('../config/database');

async function publishAllAE() {
  const rootPath = '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E';
  
  console.log(`=== SETTING 100% PUBLISHED FOR ${rootPath} ===\n`);

  const res = await query(`
    UPDATE content_catalog
    SET status = 'published',
        published_at = COALESCE(published_at, NOW()),
        updated_at = NOW(),
        payload = jsonb_set(
          jsonb_set(payload, '{status}', '"published"'),
          '{publishedAt}', to_jsonb(COALESCE(published_at, NOW()))
        )
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
  `, [`%${rootPath}%`]);

  console.log(`✓ Set status='published' for ${res.rowCount} series.`);

  const check = await query(`
    SELECT id, title, status
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE $1
  `, [`%${rootPath}%`]);

  const pub = check.rows.filter(r => r.status === 'published');
  const drf = check.rows.filter(r => r.status === 'draft');

  console.log(`\n========================================`);
  console.log(`STATUS REPORT FOR TV_Web_Series-0-9_A-E:`);
  console.log(`Total Series in DB: ${check.rows.length}`);
  console.log(`- PUBLISHED: ${pub.length} (100%)`);
  console.log(`- DRAFT: ${drf.length} (0%)`);
  console.log(`========================================`);

  process.exit(0);
}

publishAllAE().catch(console.error);
