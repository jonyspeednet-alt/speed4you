/**
 * inspect_admin_all_content_breakdown.js
 * Inspects all 169 drafts, 38 needs review, and 69 duplicates across the ENTIRE system.
 */
require('dotenv').config();
const { query } = require('../config/database');

async function inspectGlobalContent() {
  console.log('=== GLOBAL ADMIN CONTENT BREAKDOWN ===\n');

  // 1. Overall stats
  const totalRes = await query(`SELECT count(*) FROM content_catalog`);
  const pubRes = await query(`SELECT count(*) FROM content_catalog WHERE status = 'published'`);
  const draftRes = await query(`SELECT count(*) FROM content_catalog WHERE status = 'draft'`);
  const needsReviewRes = await query(`SELECT count(*) FROM content_catalog WHERE metadata_status = 'needs_review'`);
  const dupRes = await query(`SELECT count(*) FROM content_catalog WHERE duplicate_count > 0`);

  console.log(`Total DB Rows: ${totalRes.rows[0].count}`);
  console.log(`- Published: ${pubRes.rows[0].count}`);
  console.log(`- Drafts: ${draftRes.rows[0].count}`);
  console.log(`- Needs Review: ${needsReviewRes.rows[0].count}`);
  console.log(`- Duplicates: ${dupRes.rows[0].count}`);

  // 2. Breakdown Drafts by sourceRoot / sourcePath
  console.log('\n=== DRAFT BREAKDOWN BY ROOT ===');
  const draftRoots = await query(`
    SELECT payload->>'sourceRootId' AS root_id,
           payload->>'sourcePath' AS source_path,
           content_type,
           count(*) AS count
    FROM content_catalog
    WHERE status = 'draft'
    GROUP BY root_id, source_path, content_type
    ORDER BY count DESC
    LIMIT 30
  `);
  draftRoots.rows.forEach(r => {
    console.log(`Root: "${r.root_id || 'unknown'}" | Type: ${r.content_type} | Count: ${r.count} | Path: ${r.source_path || 'N/A'}`);
  });

  // 3. Sample 20 Draft items
  console.log('\n=== SAMPLE DRAFT ITEMS (20) ===');
  const draftSample = await query(`
    SELECT id, title, content_type, metadata_status, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE status = 'draft'
    LIMIT 20
  `);
  draftSample.rows.forEach(r => {
    console.log(`ID:${r.id} | title:"${r.title}" | type:${r.content_type} | meta:${r.metadata_status} | path:${r.source_path}`);
  });

  // 4. Sample Needs Review
  console.log('\n=== SAMPLE NEEDS REVIEW ITEMS (15) ===');
  const nrSample = await query(`
    SELECT id, title, status, content_type, payload->>'metadataConfidence' AS conf, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE metadata_status = 'needs_review'
    LIMIT 15
  `);
  nrSample.rows.forEach(r => {
    console.log(`ID:${r.id} | title:"${r.title}" | status:${r.status} | conf:${r.conf} | path:${r.source_path}`);
  });

  process.exit(0);
}

inspectGlobalContent().catch(console.error);
