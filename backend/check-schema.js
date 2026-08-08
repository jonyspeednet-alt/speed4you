const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'content_catalog' 
    ORDER BY ordinal_position
  `);
  
  console.log('content_catalog columns:');
  result.rows.forEach(row => {
    console.log('- ' + row.column_name + ': ' + row.data_type);
  });
  
  process.exit(0);
})();
