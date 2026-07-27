const { execSync } = require('child_process');

// Fix Dhamaal 4
const sql = `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', to_jsonb('/var/www/html/Requested/Movies/Dhamaal-4 (2026) Hindi 720p HDTS x264 ESub [DDN]/Dhamaal-4 (2026) Hindi 720p HDTS x264 ESub [DDN].mp4'::text)) WHERE id = 32715;`;
require('fs').writeFileSync('/tmp/fix_32715.sql', sql);
execSync('PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f /tmp/fix_32715.sql -t -A 2>&1', { encoding: 'utf8', timeout: 10000 });

const result = execSync("PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c \"SELECT payload->>'sourcePath' FROM content_catalog WHERE id = 32715;\"", { encoding: 'utf8', timeout: 10000 }).trim();
console.log('Dhamaal 4 sourcePath:', result);
