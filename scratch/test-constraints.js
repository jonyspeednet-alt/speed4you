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

  try {
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as condef
      FROM pg_constraint
      WHERE conrelid = 'content_catalog'::regclass
    `);
    console.log('\n--- Constraints of content_catalog ---');
    res.rows.forEach(r => console.log(`${r.conname} | ${r.condef}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
