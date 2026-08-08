/**
 * inspect_current_3_drafts.js
 * Inspects the exact 3 drafts, 1 needs review, and 22 duplicates in DB right now
 */
require('dotenv').config();
const { query } = require('../config/database');

async function inspectCurrentState() {
  console.log('=== INSPECTING CURRENT DRAFTS, NEEDS REVIEW, & DUPLICATES ===\n');

  // 1. Drafts
  const drafts = await query(`
    SELECT id, title, content_type, status, metadata_status, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE status = 'draft'
  `);
  console.log(`DRAFTS (${drafts.rows.length}):`);
  drafts.rows.forEach(r => console.log(`  - ID:${r.id} "${r.title}" meta:${r.metadata_status} path:${r.source_path}`));

  // 2. Needs Review
  const nr = await query(`
    SELECT id, title, content_type, status, metadata_status, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE metadata_status = 'needs_review'
  `);
  console.log(`\nNEEDS REVIEW (${nr.rows.length}):`);
  nr.rows.forEach(r => console.log(`  - ID:${r.id} "${r.title}" status:${r.status} path:${r.source_path}`));

  // 3. Duplicates
  const dups = await query(`
    SELECT id, title, content_type, status, duplicate_count, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE duplicate_count > 0
    ORDER BY title
  `);
  console.log(`\nDUPLICATES (${dups.rows.length}):`);
  dups.rows.forEach(r => console.log(`  - ID:${r.id} "${r.title}" dupCount:${r.duplicate_count} path:${r.source_path}`));

  process.exit(0);
}

inspectCurrentState().catch(console.error);
