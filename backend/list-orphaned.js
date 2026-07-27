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

const files = getAllFiles(REQUESTED);
files.sort();
files.forEach(f => {
  try {
    const st = fs.statSync(f);
    const sizeMB = (st.size / 1024 / 1024).toFixed(1);
    console.log(path.basename(f) + '|' + sizeMB + 'MB');
  } catch {
    console.log(path.basename(f) + '|?MB');
  }
});
