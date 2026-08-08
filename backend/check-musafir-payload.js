const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query(`
    SELECT id, title, source_root_id, status, payload 
    FROM content_catalog 
    WHERE title ILIKE '%Musafir%'
    ORDER BY created_at DESC
  `);
  
  console.log('Existing Musafir Cafe entries:', result.rows.length);
  if (result.rows.length > 0) {
    console.log('Entries:');
    result.rows.forEach(row => {
      console.log('- ID: ' + row.id + ', Title: ' + row.title + ', Status: ' + row.status);
      console.log('  Payload:', JSON.stringify(row.payload, null, 2));
    });
  }
  
  process.exit(0);
})();
