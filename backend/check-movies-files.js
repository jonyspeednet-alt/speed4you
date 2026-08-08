const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT id, title, status FROM content_catalog WHERE source_root_id = 'south-indian-movies' AND status = 'draft' ORDER BY title");
  console.log("Total draft items:", result.rows.length);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
