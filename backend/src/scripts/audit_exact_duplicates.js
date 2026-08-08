/**
 * audit_exact_duplicates.js
 * Analyzes the root cause of duplicates and drafts in DB
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');

async function auditDuplicates() {
  console.log('=== AUDITING DUPLICATES & DRAFTS ROOT CAUSE ===\n');

  // 1. Check current 3 drafts
  const drafts = await query(`
    SELECT id, title, content_type, status, metadata_status, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE status = 'draft'
  `);
  console.log(`CURRENT DRAFT ITEMS (${drafts.rows.length}):`);
  drafts.rows.forEach(r => console.log(`  - ID:${r.id} "${r.title}" path:${r.source_path}`));

  // 2. Group duplicate rows in DB by title_key & content_type
  const dupGroups = await query(`
    SELECT title_key, content_type, count(*) AS cnt, array_agg(id) AS ids
    FROM content_catalog
    WHERE title_key IS NOT NULL AND title_key != ''
    GROUP BY title_key, content_type
    HAVING count(*) > 1
    ORDER BY cnt DESC
  `);

  console.log(`\nDUPLICATE TITLE GROUPS IN DB: ${dupGroups.rows.length} groups`);

  let totalPhysicalDups = 0;
  let totalDbOnlyDups = 0;

  for (const g of dupGroups.rows.slice(0, 40)) {
    console.log(`\n--- TitleKey: "${g.title_key}" (${g.cnt} DB entries, IDs: ${g.ids.join(', ')}) ---`);
    const rows = await query(`
      SELECT id, title, payload->>'sourcePath' AS source_path, payload->>'scanSignature' AS sig
      FROM content_catalog
      WHERE id = ANY($1)
    `, [g.ids]);

    rows.rows.forEach(r => {
      const exists = r.source_path ? fs.existsSync(r.source_path) : false;
      if (exists) totalPhysicalDups++;
      else totalDbOnlyDups++;
      console.log(`  [ID:${r.id}] "${r.title}" | existsOnDisk:${exists} | sig:${r.sig || 'null'} | path:${r.source_path}`);
    });
  }

  console.log(`\n========================================`);
  console.log(`DUPLICATE ROOT CAUSE SUMMARY:`);
  console.log(`- Duplicate Title Groups in DB: ${dupGroups.rows.length}`);
  console.log(`- Physical Files/Folders existing on Disk: ${totalPhysicalDups}`);
  console.log(`- DB Rows referencing non-existent/stale paths: ${totalDbOnlyDups}`);
  console.log(`========================================`);

  process.exit(0);
}

auditDuplicates().catch(console.error);
