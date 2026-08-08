/**
 * publish_matched_drafts.js
 * 
 * Publishes all series/movie items that are:
 *   - status = 'draft'
 *   - metadataStatus = 'matched' (successfully identified by enricher)
 * 
 * These items were stuck as draft due to the old confidence >= 70 gate
 * in upsertScannedItem. Now that gate has been removed from scanner code,
 * we also need to fix existing drafts retroactively.
 */
require('dotenv').config();
const { query } = require('../config/database');

async function publishMatchedDrafts() {
  console.log('=== Publishing matched draft items ===\n');

  // Find all draft items that metadata enricher has matched
  const findRes = await query(`
    SELECT id, title, content_type, payload->>'metadataConfidence' AS confidence,
           payload->>'scanSignature' AS sig
    FROM content_catalog
    WHERE status = 'draft'
      AND metadata_status = 'matched'
    ORDER BY content_type, title
  `);

  const items = findRes.rows;
  console.log(`Found ${items.length} draft items with metadataStatus='matched'\n`);

  if (items.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  const now = new Date().toISOString();
  let published = 0;
  let errors = 0;

  for (const item of items) {
    try {
      await query(`
        UPDATE content_catalog
        SET status = 'published',
            published_at = $2,
            updated_at = $3,
            payload = jsonb_set(
              jsonb_set(payload, '{status}', '"published"'),
              '{publishedAt}', $4::jsonb
            )
        WHERE id = $1 AND status = 'draft'
      `, [item.id, now, now, JSON.stringify(now)]);

      published++;
      console.log(`  [PUBLISHED] ${item.content_type} | ID:${item.id} | "${item.title}" (confidence: ${item.confidence || 'N/A'})`);
    } catch (err) {
      errors++;
      console.error(`  [ERROR] ID:${item.id} "${item.title}": ${err.message}`);
    }
  }

  console.log(`\n=== DONE: ${published} published, ${errors} errors ===\n`);

  // Show final state of /Requested/Series/ items
  console.log('=== Final /Requested/Series/ status ===');
  const finalRes = await query(`
    SELECT id, title, status
    FROM content_catalog
    WHERE content_type = 'series'
      AND payload->>'sourcePath' LIKE '%/Requested/Series/%'
    ORDER BY status, title
  `);
  const byStatus = { published: [], draft: [] };
  finalRes.rows.forEach(r => {
    const g = r.status === 'published' ? 'published' : 'draft';
    byStatus[g].push(r);
  });
  
  console.log(`\nPUBLISHED (${byStatus.published.length}):`);
  byStatus.published.forEach(r => console.log(`  [PUBLISHED] ID:${r.id} "${r.title}"`));
  
  console.log(`\nDRAFT (${byStatus.draft.length}) [need_manual_check - metadata not found]:`);
  byStatus.draft.forEach(r => console.log(`  [DRAFT] ID:${r.id} "${r.title}"`));

  process.exit(0);
}

publishMatchedDrafts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
