/**
 * Moves scanner-created public cards without essential metadata back to draft.
 *
 * Safe by default: it only reports candidates. Run with --apply after a
 * deployment. Add --all-types to include series; the default is movies.
 */
require('dotenv').config();

const { query } = require('../config/database');

const apply = process.argv.includes('--apply');
const allTypes = process.argv.includes('--all-types');

async function main() {
  const typeClause = allTypes ? '' : "AND content_type = 'movie'";
  const result = await query(`
    SELECT id, payload
    FROM content_catalog
    WHERE source_type = 'scanner'
      AND status = 'published'
      ${typeClause}
      AND (
        COALESCE(payload->>'poster', '') = ''
        OR COALESCE(payload->>'description', '') = ''
      )
    ORDER BY id DESC
  `);

  console.log(`${apply ? 'Quarantining' : 'Would quarantine'} ${result.rows.length} incomplete published scanner item(s).`);
  for (const row of result.rows.slice(0, 20)) {
    console.log(`- ${row.id}: ${row.payload?.title || '(untitled)'}`);
  }
  if (!apply || result.rows.length === 0) return;

  for (const row of result.rows) {
    const item = {
      ...row.payload,
      status: 'draft',
      metadataStatus: row.payload?.metadataStatus === 'matched' ? 'not_found' : (row.payload?.metadataStatus || 'not_found'),
      metadataError: row.payload?.metadataError || 'Quarantined: poster or description is missing.',
      updatedAt: new Date().toISOString(),
    };
    await query(
      `UPDATE content_catalog
       SET payload = $2::jsonb, status = 'draft', updated_at = NOW(), published_at = NULL,
           metadata_status = $3
       WHERE id = $1`,
      [row.id, JSON.stringify(item), item.metadataStatus],
    );
  }
  console.log(`Quarantined ${result.rows.length} item(s) to draft.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
