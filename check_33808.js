const db = require('./src/config/database');
db.query('SELECT id, title, type, status, slug, root_id, year, poster, backdrop, description FROM content_items WHERE id = 33808')
  .then(r => console.log(JSON.stringify(r.rows, null, 2)))
  .catch(e => console.error(e.message))
  .finally(() => process.exit());