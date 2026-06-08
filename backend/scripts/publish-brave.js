const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/database');
const { updateItem } = require('../src/data/store');
const { fetchMetadataByTmdbId } = require('../src/services/metadata-enricher');

async function run() {
  console.log('Querying Bravest Warriors (2012) movie entry...');
  const result = await db.query(
    "SELECT id, payload FROM content_catalog WHERE payload->>'scanSignature' = '3d-movies:2012/Bravest Warriors (2012)'"
  );
  
  if (!result.rows.length) {
    console.log('Movie entry not found in database!');
    process.exit(1);
  }
  
  const row = result.rows[0];
  const item = row.payload;
  console.log('Found ID:', row.id, 'Current Title:', item.title);

  console.log('Fetching TMDB metadata for Brave (2012) [TMDB ID: 62177]...');
  const metadata = await fetchMetadataByTmdbId(62177, 'movie');
  
  console.log('Enriching item with Brave metadata...');
  const updatedPayload = Object.assign({}, item, metadata, {
    title: 'Brave',
    year: 2012,
    status: 'published',
    publishedAt: new Date().toISOString()
  });

  await updateItem(row.id, updatedPayload);
  console.log('Item updated and published successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
