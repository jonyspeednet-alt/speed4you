const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT value FROM app_state WHERE key = 'last_scan_summary'");
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
