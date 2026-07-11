const { Client } = require('../backend/node_modules/pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'isp_entertainment',
    user: process.env.DB_USER || 'postgres',
    ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
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
