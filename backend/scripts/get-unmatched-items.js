const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'isp_entertainment',
  user: 'postgres',
  password: 'postgres',
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