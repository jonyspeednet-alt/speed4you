const { execSync } = require('child_process');
const fs = require('fs');

const results = JSON.parse(fs.readFileSync('/tmp/ctg-download-results.json', 'utf8'));
const downloaded = results.filter(r => r.status === 'downloaded');

console.log(`Updating ${downloaded.length} DB entries...`);

let success = 0;
let errors = 0;

for (const item of downloaded) {
  const fullPath = item.path; // e.g. /var/www/html/Requested/Movies/...
  const sourcePath = fullPath; // Full path for sourcePath
  
  // Get file size
  let fileSize = 0;
  try {
    const stat = fs.statSync(fullPath);
    fileSize = stat.size;
  } catch (e) {
    console.log(`  Warning: Could not stat ${fullPath}`);
  }

  // Update sourcePath in payload
  const sql = `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', to_jsonb('${sourcePath.replace(/'/g, "''")}'::text)), payload = jsonb_set(payload, '{fileSize}', '${fileSize}'::jsonb) WHERE id = ${item.dbId};`;
  
  try {
    execSync(`echo '${Buffer.from(sql).toString('base64')}' | base64 -d | PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A 2>&1`, {
      encoding: 'utf8',
      timeout: 10000,
    });
    console.log(`  [${item.dbId}] ${item.title} -> OK (${(fileSize / 1024 / 1024).toFixed(0)} MB)`);
    success++;
  } catch (err) {
    console.log(`  [${item.dbId}] ${item.title} -> ERROR: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone: ${success} updated, ${errors} errors`);
