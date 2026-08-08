/**
 * inspect_tv_series_root_config.js
 * Check all scanner roots in app_state / database to list exact paths mapped to TV_Series
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');

async function inspectRoots() {
  console.log('=== INSPECTING TV_Series MAIN DIRECTORY ===\n');

  const tvSeriesMain = '/var/www/html/TV_Series';
  if (fs.existsSync(tvSeriesMain)) {
    const subDirs = fs.readdirSync(tvSeriesMain, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    console.log(`Subdirectories inside /var/www/html/TV_Series/ (${subDirs.length}):`);
    subDirs.forEach(s => console.log(`  - "${s}"`));
  }

  // Check DB root config
  const rootRes = await query("SELECT value FROM app_state WHERE key = 'scanner_roots'");
  if (rootRes.rows.length) {
    console.log('\nScanner roots configured in DB:');
    const roots = typeof rootRes.rows[0].value === 'string' ? JSON.parse(rootRes.rows[0].value) : rootRes.rows[0].value;
    roots.forEach(r => console.log(`  - ID: ${r.id} | Label: "${r.label}" | Path: "${r.path}"`));
  }

  process.exit(0);
}

inspectRoots().catch(console.error);
