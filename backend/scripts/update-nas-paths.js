const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = '/var/www/html';
const requestedDir = path.join(MEDIA_ROOT, 'Requested', 'Movies');

const files = fs.readdirSync(requestedDir).filter(f => {
  return ['.mkv', '.mp4', '.avi', '.mov'].includes(path.extname(f).toLowerCase());
});

console.log(`Files: ${files.length}`);

// Get all published entries with no sourcePath
let dbEntries = [];
try {
  const result = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT id, title FROM content_catalog WHERE status='published' AND (payload->>'sourcePath' IS NULL OR payload->>'sourcePath' = '');" 2>&1`, { timeout: 10000 }).toString().trim();
  dbEntries = result.split('\n').map(line => {
    const [id, ...titleParts] = line.split('|');
    return { id: parseInt(id), title: titleParts.join('|').trim() };
  });
} catch (e) { console.log('DB error:', e.message); }

console.log(`DB entries without sourcePath: ${dbEntries.length}`);

let matched = 0;

for (const file of files) {
  const fileTitle = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Find best match
  let bestMatch = null;
  let bestScore = 0;
  
  for (const entry of dbEntries) {
    if (!entry.id) continue;
    const dbTitle = entry.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Exact match
    if (fileTitle === dbTitle) { bestMatch = entry; bestScore = 100; break; }
    
    // One contains the other
    if (fileTitle.includes(dbTitle) || dbTitle.includes(fileTitle)) {
      const score = Math.min(fileTitle.length, dbTitle.length) / Math.max(fileTitle.length, dbTitle.length) * 80;
      if (score > bestScore) { bestScore = score; bestMatch = entry; }
    }
  }
  
  if (bestMatch && bestScore >= 60) {
    const relPath = '/Requested/Movies/' + file;
    const sqlFile = `/tmp/upd-${bestMatch.id}.sql`;
    fs.writeFileSync(sqlFile, `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', '"${relPath}"'::jsonb) WHERE id = ${bestMatch.id};`);
    try {
      execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f "${sqlFile}" 2>&1`, { timeout: 5000 });
      console.log(`  ${bestMatch.id} | ${bestMatch.title} -> ${file} (${bestScore.toFixed(0)}%)`);
      matched++;
    } catch (e) { console.log(`  DB error for ${file}: ${e.message}`); }
  }
}

console.log(`\nMatched: ${matched}/${files.length}`);
