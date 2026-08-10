require('dotenv').config();
const { query } = require('../config/database');
const { enrichItemWithMetadata } = require('../services/metadata-enricher');

async function main() {
  // Re-fetch metadata for item 27561 (Dridam) with correct filename
  const res = await query(`SELECT id, payload FROM content_catalog WHERE id = 27561`);
  const row = res.rows[0];
  if (!row) { console.log('Not found'); process.exit(0); }

  const payload = row.payload;
  // Clear old metadata so enricher fetches fresh from new filename
  payload.tmdbId = null;
  payload.metadataStatus = 'pending';
  payload.title = 'Dridam'; // from current filename Dridam (2026).mkv

  console.log('Re-enriching ID:27561 with title:', payload.title);
  const enriched = await enrichItemWithMetadata(payload);
  const now = new Date().toISOString();

  await query(`
    UPDATE content_catalog
    SET payload = $2::jsonb,
        title = $3,
        title_key = $4,
        updated_at = $5,
        metadata_status = $6
    WHERE id = $1
  `, [row.id, JSON.stringify(enriched), enriched.title, (enriched.title || '').toLowerCase(), now, enriched.metadataStatus]);

  console.log('Done!');
  console.log('  New title       :', enriched.title);
  console.log('  metadataStatus  :', enriched.metadataStatus);
  console.log('  poster          :', enriched.poster);
  console.log('  tmdbId          :', enriched.tmdbId);
  process.exit(0);
}
main().catch(console.error);
