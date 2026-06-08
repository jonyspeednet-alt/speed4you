require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

async function main() {
  await ensureContentStore();

  // Verify Brave movie
  const r = await db.query(
    "SELECT id, payload->>'title' as title, payload->>'year' as yr, status, metadata_status, payload->>'tmdbId' as tmdb FROM content_catalog WHERE id = $1",
    [13967]
  );
  console.log('=== BRAVE MOVIE ===');
  console.log(JSON.stringify(r.rows[0], null, 2));

  // Also check draft count
  const drafts = await db.query(
    "SELECT id, payload->>'title' as title, payload->>'sourcePath' as src FROM content_catalog WHERE status='draft' ORDER BY id DESC LIMIT 20"
  );
  console.log('\n=== REMAINING DRAFTS ===');
  drafts.rows.forEach(row => console.log(`  id=${row.id} | ${row.title}`));
  console.log(`  Total: ${drafts.rowCount}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
