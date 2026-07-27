const { execSync } = require('child_process');
const fs = require('fs');

const results = JSON.parse(fs.readFileSync('/tmp/ctg-download-results.json', 'utf8'));
const downloaded = results.filter(r => r.status === 'downloaded');

console.log(`Fixing ${downloaded.length} sourcePaths...`);

for (const item of downloaded) {
  const fullPath = item.path;
  const sourcePath = fullPath.startsWith('/var/www/html/') ? fullPath : '/var/www/html/' + fullPath;
  
  // First check current value
  let currentPath = '';
  try {
    currentPath = execSync(
      `PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT payload->>'sourcePath' FROM content_catalog WHERE id = ${item.dbId};"`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
  } catch (e) {}

  if (currentPath === sourcePath) {
    console.log(`  [${item.dbId}] ${item.title} -> Already correct`);
    continue;
  }

  // Update using a temp SQL file to avoid shell escaping issues
  const sql = `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', to_jsonb('${sourcePath.replace(/'/g, "''")}'::text)) WHERE id = ${item.dbId};`;
  const tmpFile = `/tmp/fix_${item.dbId}.sql`;
  
  try {
    // Write SQL to temp file on server
    execSync(`cat > ${tmpFile} << 'ENDSQL'\n${sql}\nENDSQL`, { encoding: 'utf8', timeout: 5000 });
    execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f ${tmpFile} -t -A 2>&1`, { encoding: 'utf8', timeout: 10000 });
    
    // Verify
    const newPath = execSync(
      `PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT payload->>'sourcePath' FROM content_catalog WHERE id = ${item.dbId};"`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    
    console.log(`  [${item.dbId}] ${item.title} -> ${newPath === sourcePath ? 'OK' : 'MISMATCH: ' + newPath}`);
  } catch (err) {
    console.log(`  [${item.dbId}] ${item.title} -> ERROR: ${err.message.substring(0, 100)}`);
  }
}

console.log('Done');
