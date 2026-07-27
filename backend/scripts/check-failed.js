const fs = require('fs');
const log = fs.readFileSync('/tmp/nas-bulk.log', 'utf8');
const lines = log.split('\n');
const failed = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('No video')) {
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const m = lines[j].match(/--- (.+) \(/);
      if (m) { failed.push(m[1]); break; }
    }
  }
}
console.log('Failed (' + failed.length + '):');
failed.forEach(f => console.log('  ' + f));
