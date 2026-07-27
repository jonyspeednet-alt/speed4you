const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = '/var/www/html';
const requestedDir = path.join(MEDIA_ROOT, 'Requested', 'Movies');

const files = fs.readdirSync(requestedDir).filter(f => {
  return ['.mkv', '.mp4', '.avi', '.mov'].includes(path.extname(f).toLowerCase());
});

console.log(`Files: ${files.length}`);

// Get next available ID
let nextId = 40000;
try {
  const result = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT MAX(id) FROM content_catalog;" 2>&1`, { timeout: 5000 }).toString().trim();
  if (result) nextId = parseInt(result) + 1;
} catch (e) {}
console.log(`Starting IDs from: ${nextId}`);

let created = 0;
let skipped = 0;

for (const file of files) {
  const relPath = `/Requested/Movies/${file}`;
  
  // Check if this path already exists in DB
  try {
    const check = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT id FROM content_catalog WHERE payload->>'sourcePath' = '${relPath}' LIMIT 1;" 2>&1`, { timeout: 5000 }).toString().trim();
    if (check) { skipped++; continue; }
  } catch (e) {}
  
  const title = path.basename(file, path.extname(file))
    .replace(/\s+/g, ' ')
    .trim();
  
  const sql = `INSERT INTO content_catalog (id, title, content_type, status, payload) VALUES (${nextId}, '${title.replace(/'/g, "''")}', 'movie', 'published', '{"sourcePath": "${relPath}", "metadataStatus": "pending"}'::jsonb);`;
  
  const sqlFile = `/tmp/ins-${nextId}.sql`;
  fs.writeFileSync(sqlFile, sql);
  
  try {
    execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f "${sqlFile}" 2>&1`, { timeout: 5000 });
    console.log(`  ${nextId} | ${title}`);
    created++;
    nextId++;
  } catch (e) {
    console.log(`  ERROR ${nextId} | ${title}: ${e.message.substring(0, 80)}`);
  }
}

console.log(`\nDone: ${created} created, ${skipped} already exist`);
