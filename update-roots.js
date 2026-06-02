const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2] || path.join(__dirname, 'new_roots.json');
if (!fs.existsSync(configPath)) {
  console.error(`File not found: ${configPath}`);
  process.exit(1);
}

const roots = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
});
client.connect().then(async () => {
  await client.query("UPDATE app_state SET value = $1::jsonb WHERE key = 'scanner_roots'", [JSON.stringify(roots)]);
  await client.query('DELETE FROM scanner_roots');
  for (const root of roots) {
    await client.query(
      `INSERT INTO scanner_roots (id, label, scan_path, public_base_url, type, language, category, max_depth, batch_size, enabled, discovered, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [String(root.id || ''), String(root.label || ''), String(root.scanPath || ''), String(root.publicBaseUrl || ''),
       String(root.type || 'movie'), String(root.language || ''), String(root.category || ''),
       root.maxDepth != null ? Number(root.maxDepth) : null, root.batchSize != null ? Number(root.batchSize) : null,
       root.enabled !== false, Boolean(root.discovered)]
    );
  }
  console.log(`Roots updated successfully (${roots.length} roots synced to scanner_roots table)`);
  await client.end();
}).catch(e => { console.error(e); process.exit(1); });
