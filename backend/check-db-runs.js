const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query('SELECT * FROM scanner_runs ORDER BY created_at DESC LIMIT 3');
  console.log('Recent scanner runs:', result.rows.length);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
