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

  console.log('Initial test of Q6:');
  const initial = await runQ6();
  if (initial) {
    console.log('Already working!');
    await client.end();
    return;
  }

  // Try dropping idx_content_catalog_search
  console.log('\nDropping idx_content_catalog_search...');
  try {
    await client.query('DROP INDEX IF EXISTS idx_content_catalog_search');
    console.log('Dropped idx_content_catalog_search.');
  } catch (e) {
    console.error('Failed to drop idx_content_catalog_search:', e.message);
  }

  console.log('Testing Q6 after dropping idx_content_catalog_search:');
  const step1 = await runQ6();
  if (step1) {
    console.log('Success after dropping idx_content_catalog_search!');
    await client.end();
    return;
  }

  // Try dropping idx_content_catalog_title_trgm
  console.log('\nDropping idx_content_catalog_title_trgm...');
  try {
    await client.query('DROP INDEX IF EXISTS idx_content_catalog_title_trgm');
    console.log('Dropped idx_content_catalog_title_trgm.');
  } catch (e) {
    console.error('Failed to drop idx_content_catalog_title_trgm:', e.message);
  }

  console.log('Testing Q6 after dropping idx_content_catalog_title_trgm:');
  const step2 = await runQ6();
  if (step2) {
    console.log('Success after dropping idx_content_catalog_title_trgm!');
    await client.end();
    return;
  }

  // Let's list remaining indexes to see if there's another
  const indexes = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'content_catalog'
  `);
  console.log('\nRemaining Indexes:');
  indexes.rows.forEach(r => console.log(`${r.indexname} | ${r.indexdef}`));

  await client.end();
}

main();
