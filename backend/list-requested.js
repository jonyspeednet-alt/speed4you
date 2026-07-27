const fs = require('fs');
const path = require('path');

const REQUESTED = '/var/www/html/Requested';

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

const onDisk = getAllFiles(REQUESTED);
const onDiskNames = new Set(onDisk.map(f => path.basename(f)));

console.log('Files on disk: ' + onDisk.length);
console.log('---');
console.log('Sample of files on disk:');
onDisk.slice(0, 30).forEach(f => console.log('  ' + path.basename(f)));
if (onDisk.length > 30) console.log('  ... and ' + (onDisk.length - 30) + ' more');
