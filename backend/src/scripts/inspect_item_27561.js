require('dotenv').config();
const { query } = require('../config/database');

async function main() {
  const res = await query(`SELECT id, title, title_key, metadata_status, payload FROM content_catalog WHERE id = 27561`);
  const row = res.rows[0];
  if (!row) { console.log('Not found'); process.exit(0); }
  const p = row.payload;
  console.log('=== ID 27561 ===');
  console.log('title (DB column)   :', row.title);
  console.log('title_key           :', row.title_key);
  console.log('metadata_status     :', row.metadata_status);
  console.log('payload.title       :', p.title);
  console.log('payload.sourcePath  :', p.sourcePath);
  console.log('payload.videoUrl    :', p.videoUrl);
  console.log('payload.poster      :', p.poster);
  console.log('payload.tmdbId      :', p.tmdbId);
  console.log('payload.metadataStatus :', p.metadataStatus);
  console.log('payload.metadataConfidence :', p.metadataConfidence);
  process.exit(0);
}
main().catch(console.error);
