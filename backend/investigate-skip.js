const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT id, title, payload FROM content_catalog WHERE source_root_id = 'requested-series' ORDER BY title");
  
  console.log('Total requested-series items:', result.rows.length);
  console.log('Items:');
  result.rows.forEach(item => {
    const sourcePath = item.payload?.sourcePath || 'N/A';
    console.log('- ' + item.title + ' (ID: ' + item.id + ')');
    console.log('  Source: ' + sourcePath);
  });
  
  process.exit(0);
})();
