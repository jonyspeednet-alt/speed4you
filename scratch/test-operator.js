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
    const res = await client.query("SELECT id FROM content_catalog WHERE (payload->>'originalTitle') % 'spider' LIMIT 1");
    console.log("Result:", res.rows);
  } catch (e) {
    console.error("Error:", e.message);
  }

  await client.end();
}

main();
