const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query('SELECT * FROM scanner_roots');
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
