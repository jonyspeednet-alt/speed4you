const { execSync } = require('child_process');
const fs = require('fs');

const nas = JSON.parse(fs.readFileSync('/tmp/nas-2026-items.json', 'utf8'));

const alreadyOnServer = [];
const notOnServer = [];

for (const item of nas) {
  // Check DB for this exact title
  const searchTitle = item.name.replace(/['"'()]/g, "''").replace(/\s+/g, ' ').trim();
  const shortTitle = item.name.split('(')[0].split(':')[0].split('1080p')[0].split('720p')[0].split('HDTC')[0].split('AMZN')[0].trim().replace(/['"'()]/g, "''").replace(/\s+/g, ' ');
  
  try {
    const result = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT id, title, payload->>'sourcePath' as sp FROM content_catalog WHERE title ILIKE '%${shortTitle.replace(/'/g, "''")}%' AND status='published' LIMIT 3;" 2>&1`, { timeout: 5000 }).toString().trim();
    
    if (result) {
      alreadyOnServer.push({ nas: item.name, db: result.split('|')[1] || 'unknown' });
    } else {
      notOnServer.push(item);
    }
  } catch (e) {
    notOnServer.push(item);
  }
}

console.log(`Already on server: ${alreadyOnServer.length}`);
console.log(`NOT on server: ${notOnServer.length}`);

console.log(`\n=== NOT ON SERVER - NEED DOWNLOAD ===`);
notOnServer.forEach(item => {
  console.log(`${item.nasPath}`);
});

// Show some sample matches for verification
console.log(`\n=== SAMPLE MATCHES (first 10) ===`);
alreadyOnServer.slice(0, 10).forEach(m => {
  console.log(`  NAS: ${m.nas} -> DB: ${m.db}`);
});

fs.writeFileSync('/tmp/nas-download-list.json', JSON.stringify(notOnServer, null, 2));
