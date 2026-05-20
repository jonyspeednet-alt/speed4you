const { Client } = require('../backend/node_modules/pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'isp_entertainment',
    user: 'postgres',
    ***REMOVED***: 'postgres',
  });

  await client.connect();
  console.log('Connected to database!');

  const runQ6 = async () => {
    try {
      await client.query("SELECT id FROM content_catalog WHERE payload->>'originalTitle' % 'spider' LIMIT 1");
      console.log("Q6 Succeeded!");
      return true;
    } catch (e) {
      console.log("Q6 Failed:", e.message);
      return false;
    }
  };

  const legacyIndexes = [
    'idx_content_catalog_featured',
    'idx_content_catalog_source',
    'idx_content_catalog_scan_signature',
    'idx_content_catalog_payload_gin',
    'idx_content_catalog_status',
    'idx_content_catalog_type',
    'idx_content_catalog_genre',
    'idx_content_catalog_language',
    'idx_content_catalog_collection',
    'idx_content_catalog_duplicates',
    'idx_content_catalog_scanner_root',
    'idx_content_catalog_scanner_root_status'
  ];

  for (const idx of legacyIndexes) {
    console.log(`\nDropping ${idx}...`);
    try {
      await client.query(`DROP INDEX IF EXISTS ${idx}`);
      console.log(`Dropped ${idx}.`);
    } catch (e) {
      console.error(`Failed to drop ${idx}:`, e.message);
    }
    const success = await runQ6();
    if (success) {
      console.log(`SUCCESS identified! The index was: ${idx}`);
      break;
    }
  }

  await client.end();
}

main();
