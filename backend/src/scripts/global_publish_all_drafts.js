/**
 * global_publish_all_drafts.js
 * Sets status='published' for ALL 169 remaining draft items across the entire site
 */
require('dotenv').config();
const { query } = require('../config/database');

async function globalPublish() {
  console.log('=== GLOBAL DRAFT TO PUBLISHED CONVERSION ===\n');

  const res = await query(`
    UPDATE content_catalog
    SET status = 'published',
        published_at = COALESCE(published_at, NOW()),
        updated_at = NOW(),
        payload = jsonb_set(
          jsonb_set(payload, '{status}', '"published"'),
          '{publishedAt}', to_jsonb(COALESCE(published_at, NOW()))
        )
    WHERE status = 'draft'
  `);

  console.log(`✓ Set status='published' for ${res.rowCount} draft items.`);

  const check = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE status = 'published') AS published,
      count(*) FILTER (WHERE status = 'draft') AS drafts,
      count(*) FILTER (WHERE metadata_status = 'needs_review') AS needs_review,
      count(*) FILTER (WHERE duplicate_count > 0) AS duplicates
    FROM content_catalog
  `);

  const r = check.rows[0];
  console.log(`\n========================================`);
  console.log(`NEW SYSTEM-WIDE SUMMARY:`);
  console.log(`- Total Content: ${r.total}`);
  console.log(`- Published: ${r.published}`);
  console.log(`- Drafts: ${r.drafts}`);
  console.log(`- Needs Review: ${r.needs_review}`);
  console.log(`- Duplicates: ${r.duplicates}`);
  console.log(`========================================`);

  process.exit(0);
}

globalPublish().catch(console.error);
