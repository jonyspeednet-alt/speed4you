'use strict';

/**
 * cleanup-auto-roots.js
 *
 * Removes all auto-discovered scanner roots (id starts with "auto-" or
 * discovered = true) from the database.
 *
 * Usage:
 *   node backend/scripts/cleanup-auto-roots.js            # apply
 *   node backend/scripts/cleanup-auto-roots.js --dry-run  # preview only
 *
 * After running, restart the backend so it reloads from the clean DB.
 * Also ensure SCANNER_AUTO_DISCOVER_ROOTS=false is set in .env.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/config/database');

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n=== Auto-Root Cleanup Script ${isDryRun ? '[DRY RUN]' : ''} ===\n`);

  // Find all auto-discovered roots
  const findResult = await db.query(
    `SELECT id, label, scan_path, discovered
     FROM scanner_roots
     WHERE discovered = true OR id LIKE 'auto-%'
     ORDER BY label ASC`,
  );

  const autoRoots = findResult.rows;

  if (autoRoots.length === 0) {
    console.log('✅ No auto-discovered roots found. Database is already clean.\n');
    process.exit(0);
  }

  console.log(`Found ${autoRoots.length} auto-discovered root(s) to remove:\n`);

  const COL = 55;
  console.log(`${'Label'.padEnd(38)} ${'Path'.padEnd(COL)}`);
  console.log('-'.repeat(98));
  for (const row of autoRoots) {
    const label = String(row.label || '').slice(0, 37).padEnd(38);
    const scanPath = String(row.scan_path || '').slice(0, COL - 1).padEnd(COL);
    console.log(`${label} ${scanPath}`);
  }

  // Show what will be kept
  const keepResult = await db.query(
    `SELECT id, label, scan_path FROM scanner_roots
     WHERE discovered = false AND id NOT LIKE 'auto-%'
     ORDER BY label ASC`,
  );

  console.log(`\n${isDryRun ? 'Would keep' : 'Keeping'} ${keepResult.rows.length} manually configured root(s):`);
  for (const row of keepResult.rows) {
    console.log(`  ✓  ${String(row.label || '').padEnd(35)} ${row.scan_path}`);
  }

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would delete ${autoRoots.length} row(s). Run without --dry-run to apply.\n`);
    process.exit(0);
  }

  // Delete auto roots
  const deleteResult = await db.query(
    `DELETE FROM scanner_roots WHERE discovered = true OR id LIKE 'auto-%'`,
  );

  console.log(`\n✅ Deleted ${deleteResult.rowCount} auto-discovered root(s) from the database.`);
  console.log('\n📋 Next steps:');
  console.log('   1. Ensure SCANNER_AUTO_DISCOVER_ROOTS=false is in your production .env');
  console.log('   2. Restart the backend server');
  console.log('   3. Only manually configured roots will now appear in the scanner dashboard\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err);
  process.exit(1);
});
