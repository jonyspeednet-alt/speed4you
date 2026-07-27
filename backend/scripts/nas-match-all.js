const { execSync } = require('child_process');
const fs = require('fs');

// Load NAS items
const nas = JSON.parse(fs.readFileSync('/tmp/nas-2026-items.json', 'utf8'));

// Get all content titles from DB
let dbTitles = [];
try {
  const result = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT title FROM content_catalog WHERE status='published';" 2>&1`, { timeout: 10000 }).toString();
  dbTitles = result.trim().split('\n').map(t => t.trim().toLowerCase());
} catch (e) {
  console.log('DB error:', e.message);
  process.exit(1);
}

console.log(`NAS items: ${nas.length}`);
console.log(`DB published items: ${dbTitles.length}`);

const notOnServer = [];
const alreadyOnServer = [];

for (const item of nas) {
  const nasName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const found = dbTitles.some(dbTitle => {
    const dbClean = dbTitle.replace(/[^a-z0-9]/g, '');
    // Check if names match (at least 70% of chars match)
    if (dbClean.includes(nasName) || nasName.includes(dbClean)) return true;
    // Check partial match
    const short = nasName.substring(0, Math.min(nasName.length, 8));
    if (dbClean.includes(short) && short.length >= 5) return true;
    return false;
  });
  
  if (found) {
    alreadyOnServer.push(item);
  } else {
    notOnServer.push(item);
  }
}

console.log(`\nAlready on server: ${alreadyOnServer.length}`);
console.log(`NOT on server (need download): ${notOnServer.length}`);

console.log(`\n=== ITEMS TO DOWNLOAD ===`);
notOnServer.forEach(item => {
  console.log(`  ${item.month} | ${item.name} | ${item.nasPath}`);
});

// Save to file for downloader script
fs.writeFileSync('/tmp/nas-download-list.json', JSON.stringify(notOnServer, null, 2));
console.log(`\nSaved download list to /tmp/nas-download-list.json`);
