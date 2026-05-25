require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { db, ensureContentStore } = require('../src/data/store/base');
const { batchEnrichItems } = require('../src/services/scanner-enhanced-metadata');
const { normalizeItem } = require('../src/data/store/helpers');

async function run() {
  await ensureContentStore();
  console.log('Fetching items with skipped metadata...');
  const sql = 'SELECT payload FROM content_catalog WHERE payload->>\'metadataStatus\' = \'skipped\' AND payload->>\'scanSignature\' IS NOT NULL AND payload->>\'scanSignature\' != \'\' ORDER BY id';
  const result = await db.query(sql);
  const items = result.rows.map(r => normalizeItem(r.payload));
  console.log('Found ' + items.length + ' items to enrich');
  if (!items.length) { console.log('Nothing to do.'); return; }

  console.log('Starting batch enrichment (concurrency=5)...');
  const { enriched, errors } = await batchEnrichItems(items, 5);
  console.log('Enriched: ' + enriched.length + ' Errors: ' + errors.length);

  if (errors.length) {
    console.log('Sample errors:');
    errors.slice(0, 5).forEach(function(e) { console.log(' - ' + (e.item?.title || '?') + ': ' + e.error); });
  }

  let updated = 0;
  for (const item of enriched) {
    const id = item.id;
    if (!id) continue;
    await db.query('UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW() WHERE id = $1', [id, JSON.stringify(item)]);
    updated++;
    if (updated % 100 === 0) console.log('Updated ' + updated + ' / ' + enriched.length);
  }
  console.log('Done. Updated ' + updated + ' items total.');
}

run().catch(function(e) { console.error('Fatal:', e); process.exit(1); }).then(function() { process.exit(0); });
