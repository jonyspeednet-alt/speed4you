const { execSync } = require('child_process');

function query(sql) {
  require('fs').writeFileSync('/tmp/q.sql', sql);
  return execSync('PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f /tmp/q.sql -t -A 2>&1', { encoding: 'utf8', timeout: 10000 }).trim();
}

function exec(sql) {
  require('fs').writeFileSync('/tmp/q.sql', sql);
  return execSync('PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f /tmp/q.sql 2>&1', { encoding: 'utf8', timeout: 10000 }).trim();
}

// 1. Delete entries with old paths (files don't exist)
const oldPathIds = [27743, 28223, 28242, 32309];
console.log('Deleting entries with old paths (files deleted):');
for (const id of oldPathIds) {
  const title = query(`SELECT title FROM content_catalog WHERE id = ${id};`);
  console.log(`  [${id}] ${title}`);
  exec(`DELETE FROM content_catalog WHERE id = ${id};`);
}

// 2. Delete scanner-created duplicate entries (31299, 31771, 32696, 32724)
const dupIds = [31299, 31771, 32696, 32724];
console.log('\nDeleting scanner-created duplicate entries:');
for (const id of dupIds) {
  const title = query(`SELECT title FROM content_catalog WHERE id = ${id};`);
  console.log(`  [${id}] ${title}`);
  exec(`DELETE FROM content_catalog WHERE id = ${id};`);
}

// 3. Delete entry 27609 (Tavvai mismatched with Dridam file)
console.log('\nDeleting mismatched entry:');
const t27609 = query(`SELECT title FROM content_catalog WHERE id = 27609;`);
console.log(`  [27609] ${t27609} -> points to Dridam file`);
exec(`DELETE FROM content_catalog WHERE id = 27609;`);

// 4. Fix 27612 (Rio -> The Furious, already has correct path)
console.log('\nFixing title mismatch:');
exec(`UPDATE content_catalog SET title = 'The Furious' WHERE id = 27612;`);
console.log('  [27612] Rio -> The Furious');

// Final count
const count = query("SELECT COUNT(*) FROM content_catalog WHERE payload->>'sourcePath' LIKE '%Requested%';");
console.log(`\nFinal Requested entries: ${count}`);

// Show remaining
const remaining = query("SELECT id, title FROM content_catalog WHERE payload->>'sourcePath' LIKE '%Requested%' ORDER BY id;");
console.log(remaining);
