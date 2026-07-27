const { execSync } = require('child_process');

try {
  const result = execSync("PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c \"SELECT id, title, status FROM content_catalog WHERE title ILIKE '%dhamaal%' OR title ILIKE '%dhamal%';\"", { encoding: 'utf8', timeout: 10000 });
  console.log('Found:', result);
} catch (e) {
  console.log('Error:', e.message);
}
