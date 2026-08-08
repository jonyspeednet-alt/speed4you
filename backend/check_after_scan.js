require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

async function checkNow() {
  const reqPath = '/var/www/html/Requested/Series';
  const dirs = fs.readdirSync(reqPath).filter(f => {
    try { return fs.statSync(path.join(reqPath, f)).isDirectory(); } catch(e) { return false; }
  });

  const dbRes = await query("SELECT id, title, status, payload FROM content_catalog WHERE content_type = 'series'");
  const reqInDb = dbRes.rows.filter(r => JSON.stringify(r.payload || {}).includes('/Requested/Series/'));
  
  console.log('=== UPDATED STATS ===');
  console.log('Total series directories on disk:', dirs.length);
  console.log('Total series in DB under /Requested/Series/:', reqInDb.length);
  
  const statusCounts = {};
  reqInDb.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  console.log('Status breakdown:', statusCounts);

  console.log('\n--- List of Series in DB ---');
  reqInDb.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.status.toUpperCase()}] ${r.title} (ID: ${r.id})`);
  });

  const missing = dirs.filter(d => !reqInDb.some(r => JSON.stringify(r.payload || {}).includes(d)));
  console.log('\nFolders still missing in DB:', missing.length);
  if (missing.length) {
    missing.forEach(m => console.log(' - ' + m));
  }

  process.exit(0);
}
checkNow().catch(console.error);
