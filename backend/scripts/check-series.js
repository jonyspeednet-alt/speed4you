const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const seriesDir = '/var/www/html/Requested/Series';
const dirs = fs.readdirSync(seriesDir).filter(d => {
  try { return fs.statSync(path.join(seriesDir, d)).isDirectory(); } catch { return false; }
});

for (const dir of dirs) {
  const full = path.join(seriesDir, dir);
  const files = fs.readdirSync(full);
  const episodes = files.filter(f => f.match(/S\d+E\d+/i));
  const totalSize = files.reduce((sum, f) => {
    try { return sum + fs.statSync(path.join(full, f)).size; } catch { return sum; }
  }, 0);
  console.log(`${dir}: ${episodes.length} episodes (${(totalSize / 1024 / 1024).toFixed(0)} MB)`);
  if (episodes.length <= 3) {
    episodes.forEach(e => console.log(`  - ${e}`));
  }
}
