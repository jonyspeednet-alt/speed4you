#!/usr/bin/env node
const { execSync } = require('child_process');
const dirs = execSync('ls -d /var/www/html/Requested/Series/*/', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
for (const d of dirs) {
  const name = d.split('/').filter(Boolean).pop();
  const count = execSync(`find "${d}" -maxdepth 1 -type f \\( -name "*.mkv" -o -name "*.mp4" \\) 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
  // Also check seasons
  const files = execSync(`find "${d}" -maxdepth 1 -type f \\( -name "*.mkv" -o -name "*.mp4" \\) 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const seasons = new Set();
  for (const f of files) {
    const m = f.match(/S(\d+)/i);
    if (m) seasons.add(parseInt(m[1]));
  }
  const seasonList = [...seasons].sort((a,b)=>a-b).join(',') || '?';
  console.log(`${count.padStart(3)} eps | S${seasonList.padEnd(10)} | ${name}`);
}
