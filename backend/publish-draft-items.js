const { db } = require('./src/data/store/base');

(async () => {
  // Publish valid draft items from south-indian-movies
  const result = await db.query(`
    UPDATE content_catalog 
    SET status = 'published' 
    WHERE source_root_id = 'south-indian-movies' 
      AND status = 'draft' 
      AND title NOT LIKE '%p'
      AND payload->>'poster' IS NOT NULL
      AND payload->>'backdrop' IS NOT NULL
      AND payload->>'description' IS NOT NULL
    RETURNING id, title, status
  `);
  
  console.log("Published items:", result.rows.length);
  console.log("Updated items:");
  result.rows.forEach(item => {
    console.log(`- ${item.title} (${item.id})`);
  });
  
  process.exit(0);
})();
