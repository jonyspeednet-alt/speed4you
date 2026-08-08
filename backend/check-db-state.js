const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT key, value FROM app_state WHERE key LIKE 'scanner%'");
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
