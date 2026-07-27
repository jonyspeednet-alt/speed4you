const { execSync } = require('child_process');

const sql = `SELECT id, title, payload->>'sourcePath' as sp FROM content_catalog WHERE status != 'deleted' AND payload->>'sourcePath' LIKE '%Requested%' ORDER BY id;`;
const b64 = Buffer.from(sql).toString('base64');
const result = execSync(
  `echo '${b64}' | base64 -d | PGPASSWORD='postgres' psql -h localhost -U postgres -d isp_entertainment -t -A -F '|'`,
  { encoding: 'utf-8', timeout: 15000 }
).trim();

const fs = require('fs');
const path = require('path');

const rows = result.split('\n').filter(Boolean).map(line => {
  const [id, title, sp] = line.split('|');
  return { id, title, sp };
});

let existing = 0, missing = 0;
const missingList = [];

for (const row of rows) {
  if (row.sp && fs.existsSync(row.sp)) {
    existing++;
  } else {
    missing++;
    missingList.push(row);
  }
}

console.log(`Total Requested DB entries: ${rows.length}`);
console.log(`Files exist on disk: ${existing}`);
console.log(`Files MISSING from disk: ${missing}`);
console.log('');
console.log('=== Missing files (in DB but not on disk): ===');
missingList.forEach(r => console.log(`  ID ${r.id}: ${r.title} -> ${r.sp}`));
