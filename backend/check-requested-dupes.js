const fs = require('fs');
const path = require('path');

const REQUESTED = '/var/www/html/Requested';
const OTHER_ROOTS = [
  '/var/www/html/English_Movies',
  '/var/www/html/Hindi_Movies',
  '/var/www/html/Other_Foreign_Movies',
  '/var/www/html/Bangla_Movies',
  '/var/www/html/Hindi_Dubbed_Movies',
  '/var/www/html/Cartoon_Movies',
  '/var/www/html/New_Collection',
  '/var/www/html/TV_Series',
];

function getAllFiles(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAllFiles(full, files);
      } else if (/\.(mkv|mp4|avi)$/i.test(entry.name)) {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

// Build index of files in other roots by name+size
const otherIndex = new Map();
for (const root of OTHER_ROOTS) {
  for (const f of getAllFiles(root)) {
    try {
      const st = fs.statSync(f);
      const key = path.basename(f) + '|' + st.size;
      otherIndex.set(key, f);
    } catch {}
  }
}

// Check Requested files
let dupes = 0, unique = 0;
const requestedFiles = getAllFiles(REQUESTED);
console.log('Total Requested files: ' + requestedFiles.length);

for (const f of requestedFiles) {
  try {
    const st = fs.statSync(f);
    const key = path.basename(f) + '|' + st.size;
    if (otherIndex.has(key)) {
      dupes++;
    } else {
      unique++;
    }
  } catch {}
}

console.log('Duplicates (same name+size in other folder): ' + dupes);
console.log('Unique to Requested: ' + unique);
