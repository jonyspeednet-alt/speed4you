const { db } = require('./src/data/store/base');
const fs = require('fs');
const path = require('path');

const seriesPath = '/var/www/html/Requested/Series';
const dbItems = await db.query(
  "SELECT id, title, payload FROM content_catalog WHERE source_root_id = 'requested-series' ORDER BY title"
);

console.log('=== Detailed Requested Series Analysis ===\n');
console.log('Filesystem folders:', fs.readdirSync(seriesPath).length);
console.log('Database items:', dbItems.rows.length);

const filesystemFolders = fs.readdirSync(seriesPath);
const dbTitles = new Set(dbItems.rows.map(item => {
  const sourcePath = item.payload?.sourcePath || '';
  return path.basename(sourcePath);
}));

console.log('\n=== Missing Series Folders ===');
const missingFolders = [];

for (const folder of filesystemFolders) {
  if (!Array.from(dbTitles).some(t => t.includes(folder.substring(0, 10)))) {
    missingFolders.push(folder);
  }
}

console.log('Total missing:', missingFolders.length);
console.log('\nMissing folders:');
missingFolders.forEach(folder => console.log('- ' + folder));

console.log('\n=== Analysis of Found vs Missing ===');
console.log('Found series in DB:');
dbItems.rows.forEach(item => {
  const sourcePath = item.payload?.sourcePath || '';
  const folderName = path.basename(sourcePath);
  console.log('- ' + item.title + ' (' + folderName + ')');
});

process.exit(0);
