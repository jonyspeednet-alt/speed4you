const { query } = require('./backend/src/config/database');

async function checkItem() {
  try {
    const result = await query('SELECT id, title, type, status, slug, root_id, year, poster, backdrop, description FROM content_items WHERE id = $1', [33808]);
    
    if (result.rows.length === 0) {
      console.log('Item 33808 not found in database');
    } else {
      console.log('Item 33808 details:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    await require('./backend/src/config/database').closePool();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItem();