require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore, refreshScannerCaches } = require('../src/data/store');

const MOVIE_ROOT_PATTERNS = [
  /movie/i, /cartoon/i, /anim(e|ation)/i, /3d/i,
  /bollywood/i, /hollywood/i, /hindi/i, /tamil/i,
  /telugu/i, /malayalam/i, /kannada/i, /bengali/i,
  /marathi/i, /punjabi/i, /gujarati/i, /odia/i,
];

async function main() {
  await ensureContentStore();

  const rootsResult = await db.query(
    `SELECT id, label, type, category, language, scan_path
     FROM scanner_roots ORDER BY label`
  );
  const misconfigured = [];
  for (const row of rootsResult.rows) {
    if (row.type !== 'series') continue;
    const isMovieLabel = MOVIE_ROOT_PATTERNS.some((p) => p.test(row.label));
    if (isMovieLabel) {
      misconfigured.push(row);
    }
  }

  if (!misconfigured.length) {
    console.log('No misconfigured movie roots found (all series-type roots look correct).');
    return;
  }

  console.log(`Found ${misconfigured.length} scanner root(s) with type='series' that look like movie roots:\n`);
  for (const root of misconfigured) {
    console.log(`  • ${root.label} (${root.id})`);
    console.log(`    Type: ${root.type}, Category: ${root.category}, Lang: ${root.language}`);
    console.log(`    Path: ${root.scan_path}`);
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM content_catalog
       WHERE source_root_id = $1 AND content_type = 'series'`,
      [root.id]
    );
    console.log(`    Entries to delete: ${countResult.rows[0]?.count || 0}\n`);
  }

  if (process.argv.includes('--dry-run') || process.argv.includes('--dry')) {
    console.log('Dry-run mode — no changes made.');
    return;
  }

  if (!process.argv.includes('--force') && !process.argv.includes('-f')) {
    console.log('Run with --force (or -f) to apply changes, or --dry to preview.');
    return;
  }

  console.log('Applying changes...');
  for (const root of misconfigured) {
    await db.query(
      `UPDATE scanner_roots SET type = 'movie', updated_at = NOW() WHERE id = $1`,
      [root.id]
    );
    console.log(`  ✓ Updated root "${root.label}" type: series → movie`);

    const delResult = await db.query(
      `DELETE FROM content_catalog
       WHERE source_root_id = $1 AND content_type = 'series'`,
      [root.id]
    );
    console.log(`  ✓ Deleted ${delResult.rowCount} series-type entries from "${root.label}"`);
  }

  await refreshScannerCaches().catch(() => {});
  console.log('\nDone. Please run a new scan to re-index these folders as movies.');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
