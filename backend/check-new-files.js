const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT id, title, created_at FROM content_catalog WHERE source_root_id = 'south-indian-movies' AND created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 20");
  console.log("Total new items (last 7 days):", result.rows.length);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
