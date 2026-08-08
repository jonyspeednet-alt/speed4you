const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT id, title, duplicate_count, status FROM content_catalog WHERE source_root_id = 'south-indian-movies' AND duplicate_count > 0 ORDER BY duplicate_count DESC LIMIT 20");
  console.log("Total duplicate items:", result.rows.length);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
