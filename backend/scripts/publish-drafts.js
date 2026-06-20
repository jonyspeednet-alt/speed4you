require('dotenv').config();
const { enrichItemWithMetadata } = require('../src/services/scanner-enhanced-metadata');
const { query } = require('../src/config/database');

async function main() {
  const r1 = await query(
    `UPDATE content_catalog SET status = 'published', published_at = NOW(), updated_at = NOW()
     WHERE status = 'draft' AND metadata_status = 'matched'
     RETURNING id`
  );
  console.log(`Published (already matched): ${r1.rowCount}`);

  const r2 = await query(
    `SELECT id, payload FROM content_catalog
     WHERE status = 'draft' AND metadata_status IN ('needs_review', 'not_found')
     ORDER BY id`
  );
  console.log(`Drafts to enrich: ${r2.rows.length}`);

  let enriched = 0;
  for (const row of r2.rows) {
    try {
      const item = row.payload;
      const result = await enrichItemWithMetadata(item);
      const next = { ...item, ...result, status: 'published', publishedAt: new Date().toISOString() };
      await query(
        `UPDATE content_catalog
         SET payload = $2::jsonb, status = 'published', published_at = NOW(),
             updated_at = NOW(), metadata_status = $3
         WHERE id = $1`,
        [item.id, JSON.stringify(next), result.metadataStatus || item.metadataStatus]
      );
      enriched++;
    } catch (e) {
      console.error(`Error on ID ${row.id}: ${e.message}`);
    }
  }
  console.log(`Enriched + published: ${enriched}`);
  console.log('Done.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
