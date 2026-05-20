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
    const res = await client.query("SELECT id FROM content_catalog WHERE (payload->>'originalTitle') % 'spider' LIMIT 1");
    console.log("Result:", res.rows);
  } catch (e) {
    console.error("Error:", e.message);
  }

  await client.end();
}

main();
