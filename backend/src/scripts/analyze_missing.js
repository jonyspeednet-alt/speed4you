require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function analyzeMissing() {
  const reqPath = '/var/www/html/Requested/Series';
  const dirs = fs.readdirSync(reqPath).filter(f => fs.statSync(path.join(reqPath, f)).isDirectory());
  
  const dbRes = await query("SELECT id, title, payload FROM content_catalog WHERE content_type = 'series'");
  
  const missing = dirs.filter(d => {
    return !dbRes.rows.some(r => {
      const p = JSON.stringify(r.payload || {});
      return p.includes(d);
    });
  });

  console.log('MISSING COUNT:', missing.length);
  for (const m of missing) {
    const full = path.join(reqPath, m);
    console.log('\n----------------------------------------');
    console.log('Folder:', m);
    try {
      const stats = fs.statSync(full);
      console.log('Permissions:', (stats.mode & 0o777).toString(8), 'Owner UID:', stats.uid, 'GID:', stats.gid);
      const files = fs.readdirSync(full);
      console.log('Contents count:', files.length);
      files.forEach(f => {
        const sub = path.join(full, f);
        try {
          const s = fs.statSync(sub);
          if (s.isDirectory()) {
            const subFiles = fs.readdirSync(sub);
            console.log(`  [DIR] ${f} (${subFiles.length} files inside)`);
            subFiles.slice(0, 3).forEach(sf => console.log(`        - ${sf}`));
          } else {
            console.log(`  [FILE] ${f} (size: ${(s.size / 1024 / 1024).toFixed(2)} MB)`);
          }
        } catch (e) {
          console.log(`  [ERROR stat ${f}]:`, e.message);
        }
      });
    } catch(e) {
      console.log('ERROR:', e.message);
    }
  }
  process.exit(0);
}

analyzeMissing().catch(err => {
  console.error(err);
  process.exit(1);
});
