const { execSync } = require('child_process');

const fullPath = '/var/www/html/Requested/Movies/Dhamaal-4 (2026) Hindi 720p HDTS x264 ESub [DDN]/Dhamaal-4 (2026) Hindi 720p HDTS x264 ESub [DDN].mp4';
const escapedPath = fullPath.replace(/'/g, "''");
const sql = `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', to_jsonb('${escapedPath}'::text)) WHERE id = 28214;`;

require('fs').writeFileSync('/tmp/fix_dhamaal3.sql', sql);
const result = execSync('PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f /tmp/fix_dhamaal3.sql 2>&1', { encoding: 'utf8', timeout: 10000 });
console.log('SQL result:', result);

const check = execSync("PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c \"SELECT payload->>'sourcePath' FROM content_catalog WHERE id = 28214;\"", { encoding: 'utf8', timeout: 10000 });
console.log('sourcePath:', check.trim());
