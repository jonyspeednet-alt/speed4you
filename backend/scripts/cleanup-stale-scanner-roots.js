require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const dryRun = process.argv.includes('--dry');
  const specificIds = process.argv
    .filter(a => a.startsWith('--id='))
    .map(a => a.replace('--id=', ''));

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM scanner_roots ORDER BY label');
    const roots = result.rows;
    console.log(`\nFound ${roots.length} scanner roots in database:\n`);

    const toDelete = [];

    for (const root of roots) {
      const exists = fs.existsSync(root.scan_path);
      const status = exists ? '\x1b[32mEXISTS\x1b[0m' : '\x1b[31mMISSING\x1b[0m';
      console.log(`  [${status}] ${root.id.padEnd(25)} ${root.scan_path}`);

      if (!exists) {
        if (specificIds.length === 0 || specificIds.includes(root.id)) {
          toDelete.push(root);
        }
      }
    }

    if (toDelete.length === 0) {
      console.log('\nNo stale roots to delete.');
      return;
    }

    console.log(`\n${dryRun ? '[DRY-RUN] Would delete' : 'Deleting'} ${toDelete.length} stale root(s):`);
    for (const root of toDelete) {
      console.log(`  - ${root.id} (${root.label}) -> ${root.scan_path}`);
    }

    if (!dryRun) {
      const ids = toDelete.map(r => r.id);
      await client.query('DELETE FROM scanner_roots WHERE id = ANY($1::text[])', [ids]);
      console.log(`\nDeleted ${toDelete.length} root(s) from scanner_roots table.`);

      const stateResult = await client.query("SELECT value FROM app_state WHERE key = 'scanner_roots' LIMIT 1");
      if (stateResult.rows.length) {
        const stateRoots = stateResult.rows[0].value;
        if (Array.isArray(stateRoots)) {
          const filtered = stateRoots.filter(r => !ids.includes(String(r.id || '')));
          await client.query(
            "UPDATE app_state SET value = $1::jsonb, updated_at = NOW() WHERE key = 'scanner_roots'",
            [JSON.stringify(filtered)]
          );
          console.log(`Updated app_state: removed ${stateRoots.length - filtered.length} root(s).`);
        }
      }

      const scanStateRes = await client.query("SELECT value FROM app_state WHERE key = 'scanner_state' LIMIT 1");
      if (scanStateRes.rows.length) {
        const scanState = scanStateRes.rows[0].value;
        if (scanState?.roots) {
          for (const id of ids) {
            delete scanState.roots[id];
          }
          await client.query(
            "UPDATE app_state SET value = $1::jsonb, updated_at = NOW() WHERE key = 'scanner_state'",
            [JSON.stringify(scanState)]
          );
          console.log(`Cleaned up scanner_state for ${ids.length} root(s).`);
        }
      }

      console.log('\nDone. Restart the backend for changes to take effect.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
