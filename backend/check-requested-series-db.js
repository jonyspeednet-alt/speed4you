const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT id, title, status FROM content_catalog WHERE source_root_id = 'requested-series' ORDER BY title");
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
