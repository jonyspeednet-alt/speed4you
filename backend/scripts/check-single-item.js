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
    const result = await client.query('SELECT id, payload FROM content_catalog WHERE id = 28004');
    console.log('Content ID 28004:');
    const item = result.rows[0];
    console.log('Title:', item.payload.title);
    console.log('Year:', item.payload.year);
    console.log('Metadata Status:', item.payload.metadataStatus);
    console.log('TMDB ID:', item.payload.tmdbId);
    console.log('Full payload:', JSON.stringify(item.payload, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
})();