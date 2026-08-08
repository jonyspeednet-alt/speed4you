const { db } = require('./src/data/store/base');

const result = await db.query("SELECT title FROM content_catalog WHERE source_root_id = 'requested-series' ORDER BY title");
console.log('Database items:', result.rows.length);
result.rows.forEach(r => console.log(r.title));
process.exit(0);
