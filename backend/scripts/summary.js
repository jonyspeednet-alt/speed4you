const fs = require('fs');
const log = fs.readFileSync('/tmp/nas-bulk.log', 'utf8');
const lines = log.split('\n');

console.log('=== FAILED (No video files) ===');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('No video')) {
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const m = lines[j].match(/--- (.+) \(/);
      if (m) { console.log('  ' + m[1]); break; }
    }
  }
}

console.log('\n=== SKIPPED (Already existed) ===');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Exists')) {
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const m = lines[j].match(/--- (.+) \(/);
      if (m) { console.log('  ' + m[1]); break; }
    }
  }
}

// Count by month
const months = {};
for (const line of lines) {
  const m = line.match(/\((\w+)\)/);
  if (m && line.includes('OK:')) {
    months[m[1]] = (months[m[1]] || 0) + 1;
  }
}
console.log('\n=== DOWNLOADED BY MONTH ===');
Object.entries(months).sort().forEach(([k,v]) => console.log('  ' + k + ': ' + v));
