const { Client } = require('pg');
const fs = require('fs');
const roots = JSON.parse(fs.readFileSync('/tmp/new_roots.json', 'utf8'));
const client = new Client({ host: 'localhost', port: 5432, database: 'isp_entertainment', user: 'postgres', ***REMOVED***: 'postgres' });
client.connect().then(async () => {
  await client.query("UPDATE app_state SET value = $1::jsonb WHERE key = 'scanner_roots'", [JSON.stringify(roots)]);
  console.log('Roots updated successfully');
  await client.end();
}).catch(e => { console.error(e); process.exit(1); });
