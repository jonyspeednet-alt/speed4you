require('dotenv').config();
const { query } = require('./src/config/database');

async function inspectItem() {
  const res = await query("SELECT id, title, payload FROM content_catalog WHERE id = 31758");
  console.log(JSON.stringify(res.rows[0], null, 2));
  process.exit(0);
}

inspectItem().catch(console.error);
