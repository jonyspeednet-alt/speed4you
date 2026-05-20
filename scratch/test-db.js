const { Client } = require('../backend/node_modules/pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'isp_entertainment',
    user: 'postgres',
    password: 'postgres',
  });

  await client.connect();
  console.log('Connected to database!');

  try {
    // 1. Get Columns
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'content_catalog'
    `);
    console.log('\n--- Columns of content_catalog ---');
    cols.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

    // 1b. Get Index Definitions
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'content_catalog'
    `);
    console.log('\n--- Indexes of content_catalog ---');
    indexes.rows.forEach(r => console.log(`${r.indexname} | ${r.indexdef}`));

    // 2. Get Triggers
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'content_catalog'
    `);
    console.log('\n--- Triggers of content_catalog ---');
    triggers.rows.forEach(r => console.log(`${r.trigger_name} | ${r.event_manipulation} | ${r.action_statement}`));

    // 3. Test a simple search query to pinpoint the exact failure line
    console.log('\n--- Running test query ---');
    const res = await client.query(`
      SELECT payload,
             (ts_rank(search_vector, plainto_tsquery('english', 'spider')) * 10 + 
              similarity(title, 'spider') * 5) as db_score
      FROM content_catalog 
      WHERE status = 'published'
        AND ((search_vector @@ plainto_tsquery('english', 'spider')) OR (title % 'spider') OR ((payload->>'originalTitle') % 'spider'))
      ORDER BY db_score DESC 
      LIMIT 1
    `);
    console.log('Query succeeded!', res.rows.length, 'results');
  } catch (error) {
    console.error('Error during database debug:', error);
  } finally {
    await client.end();
  }
}

main();
