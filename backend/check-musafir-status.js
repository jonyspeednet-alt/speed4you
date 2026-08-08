const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT id, title, status, created_at FROM content_catalog WHERE title ILIKE '%Musafir%' OR title ILIKE '%Cafe%'");
  console.log("Musafir Cafe items:", result.rows.length);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})();
