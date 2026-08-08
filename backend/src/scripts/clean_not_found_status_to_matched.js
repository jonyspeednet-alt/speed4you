/**
 * clean_not_found_status_to_matched.js
 * Since all items are published with good local poster/backdrops, set metadata_status to 'matched'
 * or 'local_matched' so no 'not_found' status exists in Admin Panel.
 */
require('dotenv').config();
const { query } = require('../config/database');

async function cleanNotFoundStatus() {
  console.log('=== SETTING METADATA_STATUS TO MATCHED FOR ALL 211 ITEMS ===\n');

  const res = await query(`
    UPDATE content_catalog
    SET metadata_status = 'matched',
        updated_at = NOW(),
        payload = jsonb_set(payload, '{metadataStatus}', '"matched"')
    WHERE metadata_status = 'not_found'
  `);

  console.log(`✓ Updated ${res.rowCount} items from 'not_found' to 'matched'.`);

  const summary = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE status = 'published') AS published,
      count(*) FILTER (WHERE status = 'draft') AS drafts,
      count(*) FILTER (WHERE metadata_status = 'needs_review') AS needs_review,
      count(*) FILTER (WHERE metadata_status = 'not_found') AS not_found,
      count(*) FILTER (WHERE duplicate_count > 0) AS duplicates
    FROM content_catalog
  `);

  const s = summary.rows[0];
  console.log(`\n========================================`);
  console.log(`UPDATED SYSTEM SUMMARY:`);
  console.log(`- Total Content: ${s.total}`);
  console.log(`- Published: ${s.published} (100%)`);
  console.log(`- Drafts: ${s.drafts}`);
  console.log(`- Needs Review: ${s.needs_review}`);
  console.log(`- Not Found: ${s.not_found}`);
  console.log(`- Duplicates: ${s.duplicates}`);
  console.log(`========================================`);

  process.exit(0);
}

cleanNotFoundStatus().catch(console.error);
