const { db } = require('./src/data/store/base');

(async () => {
  // Check items created vs files in filesystem
  const result = await db.query("SELECT id, title, status, created_at FROM content_catalog WHERE source_root_id = 'south-indian-movies' ORDER BY created_at DESC LIMIT 50");
  console.log("Total items in DB:", result.rows.length);
  console.log("Items from last scan (Aug 6):");
  result.rows.forEach(item => {
    const date = new Date(item.created_at);
    console.log(`- ${item.title} (${item.status}) - ${date.toISOString()}`);
  });
  process.exit(0);
})();
