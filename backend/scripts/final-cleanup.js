const { execSync } = require('child_process');

function query(sql) {
  require('fs').writeFileSync('/tmp/q.sql', sql);
  return execSync('PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f /tmp/q.sql -t -A 2>&1', { encoding: 'utf8', timeout: 10000 }).trim();
}

// Delete Do Deewane Seher Mein (29325) - file not available on CTGMovies
console.log('Deleting 29325 (Do Deewane Seher Mein)...');
console.log(query("DELETE FROM content_catalog WHERE id = 29325;"));

// Check remaining Requested entries
console.log('\nRemaining Requested entries:');
const remaining = query("SELECT id, title, payload->>'sourcePath' as sp FROM content_catalog WHERE payload->>'sourcePath' LIKE '%Requested%' ORDER BY id;");
console.log(remaining);

// Count total Requested entries
const count = query("SELECT COUNT(*) FROM content_catalog WHERE payload->>'sourcePath' LIKE '%Requested%';");
console.log('\nTotal Requested entries:', count);
