const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { enrichItemWithMetadata } = require('../src/services/scanner-enhanced-metadata');
const { normalizeItem } = require('../src/data/store/helpers');
const client = new Client({ host: 'localhost', port: 5432, database: 'isp_entertainment', user: process.env.DB_USER || 'postgres', ***REMOVED***: process.env.DB_PASSWORD || 'postgres' });
async function run() {
  await client.connect();
  const { rows } = await client.query("SELECT id, payload FROM content_catalog WHERE payload->>'metadataStatus' = 'skipped' AND payload->>'scanSignature' IS NOT NULL AND payload->>'scanSignature' != '' ORDER BY id");
  const items = rows.map(r => normalizeItem(r.payload));
  console.log('Items to enrich: ' + items.length);
  let ok = 0, fail = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const enriched = await enrichItemWithMetadata(item);
      enriched.id = item.id;
      await client.query("UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW() WHERE id = $1", [item.id, JSON.stringify(enriched)]);
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 5) console.log('FAIL id=' + item.id + ' title=' + (item.title || '?') + ': ' + e.message);
    }
    if ((i + 1) % 50 === 0) console.log('Progress: ' + (i + 1) + '/' + items.length + ' OK=' + ok + ' Fail=' + fail);
  }
  console.log('DONE: OK=' + ok + ' Fail=' + fail);
  await client.end();
}
run().catch(e => { console.error('FATAL:', e); process.exit(1); });
