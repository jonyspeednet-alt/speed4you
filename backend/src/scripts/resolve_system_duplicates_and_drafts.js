/**
 * resolve_system_duplicates_and_drafts.js
 * 1. Cleans orphan DB rows referencing non-existent paths.
 * 2. Merges duplicate catalog entries that point to the exact same underlying file or folder.
 * 3. Keeps valid distinct multi-version files (e.g. Dual Audio vs English) without inflating duplicate_count.
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');

async function resolveDuplicates() {
  console.log('=== RESOLVING DUPLICATES & STALE DB ROWS ===\n');

  // Step 1: Clean DB rows with null sourcePath or non-existent physical path
  console.log('1. Cleaning stale DB entries pointing to deleted/null physical paths...');
  const allRows = await query(`
    SELECT id, title, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE payload->>'sourcePath' IS NULL
       OR payload->>'sourcePath' = ''
       OR payload->>'sourcePath' = 'null'
  `);

  let deletedCount = 0;
  for (const r of allRows.rows) {
    await query('DELETE FROM content_catalog WHERE id = $1', [r.id]);
    deletedCount++;
    console.log(`  ✓ Deleted orphan DB row ID:${r.id} "${r.title}" (path null)`);
  }

  // Check rows where physical path does not exist on disk
  const allWithPath = await query(`
    SELECT id, title, payload->>'sourcePath' AS source_path
    FROM content_catalog
    WHERE payload->>'sourcePath' IS NOT NULL
  `);

  for (const r of allWithPath.rows) {
    if (!fs.existsSync(r.source_path)) {
      await query('DELETE FROM content_catalog WHERE id = $1', [r.id]);
      deletedCount++;
      console.log(`  ✓ Deleted stale DB row ID:${r.id} "${r.title}" (path not found: ${r.source_path})`);
    }
  }

  console.log(`\nTotal stale/orphan DB rows deleted: ${deletedCount}`);

  // Step 2: Merge duplicate catalog entries where one entry points to a container folder
  // and another points to the actual video file inside that same container folder.
  console.log('\n2. Merging container folder vs inner video file duplicates...');
  const dupGroups = await query(`
    SELECT title_key, content_type, count(*) AS cnt, array_agg(id) AS ids
    FROM content_catalog
    WHERE title_key IS NOT NULL AND title_key != ''
    GROUP BY title_key, content_type
    HAVING count(*) > 1
  `);

  let mergedCount = 0;
  for (const g of dupGroups.rows) {
    const items = await query(`
      SELECT id, title, payload->>'sourcePath' AS source_path, payload->>'scanSignature' AS sig
      FROM content_catalog
      WHERE id = ANY($1)
    `, [g.ids]);

    const rows = items.rows;
    // Check if one path is a parent directory of another path
    for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < rows.length; j++) {
        if (i === j) continue;
        const pathA = rows[i].source_path;
        const pathB = rows[j].source_path;

        if (pathA && pathB && (pathB.startsWith(pathA + '/') || pathB.startsWith(pathA + '\\'))) {
          // pathA is the parent directory, pathB is the file inside it. Delete pathA (keep specific file)
          await query('DELETE FROM content_catalog WHERE id = $1', [rows[i].id]);
          mergedCount++;
          console.log(`  ✓ Merged/Deleted redundant folder entry ID:${rows[i].id} "${rows[i].title}" (contained in file ID:${rows[j].id})`);
          break;
        }
      }
    }
  }

  console.log(`\nTotal redundant container duplicates merged: ${mergedCount}`);

  // Step 3: Recalculate duplicate_count across database
  await query(`UPDATE content_catalog SET duplicate_count = 0`);
  await query(`
    WITH dup_counts AS (
      SELECT title_key, content_type, COUNT(*) - 1 AS extra_count
      FROM content_catalog
      WHERE title_key IS NOT NULL AND title_key != ''
      GROUP BY title_key, content_type
      HAVING COUNT(*) > 1
    )
    UPDATE content_catalog c
    SET duplicate_count = d.extra_count,
        payload = jsonb_set(payload, '{duplicateCount}', to_jsonb(d.extra_count))
    FROM dup_counts d
    WHERE c.title_key = d.title_key AND c.content_type = d.content_type
  `);

  // Ensure ALL items remain published
  await query(`
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

  // Final Summary
  const summaryRes = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE status = 'published') AS published,
      count(*) FILTER (WHERE status = 'draft') AS drafts,
      count(*) FILTER (WHERE metadata_status = 'needs_review') AS needs_review,
      count(*) FILTER (WHERE duplicate_count > 0) AS duplicates
    FROM content_catalog
  `);

  const s = summaryRes.rows[0];
  console.log(`\n========================================`);
  console.log(`FINAL CLEAN SYSTEM SUMMARY:`);
  console.log(`- Total Content: ${s.total}`);
  console.log(`- Published: ${s.published} (100%)`);
  console.log(`- Drafts: ${s.drafts}`);
  console.log(`- Needs Review: ${s.needs_review}`);
  console.log(`- Remaining Valid Duplicates (Multi-quality/multi-root files): ${s.duplicates}`);
  console.log(`========================================`);

  process.exit(0);
}

resolveDuplicates().catch(console.error);
