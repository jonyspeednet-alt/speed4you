require('./load-db-env');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, payload->>'title' as title, payload->>'year' as yr, payload->>'metadataStatus' as meta_status
      FROM content_catalog 
      WHERE payload->>'metadataStatus' = 'not_found'
      ORDER BY id ASC
      LIMIT 50
    `);
    console.log('Items without TMDB matches:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, Title: ${row.title}, Year: ${row.yr}, Status: ${row.meta_status}`);
    });
    console.log(`Total: ${result.rowCount}`);
  } finally {
    client.release();
    await pool.end();
  }
})();
