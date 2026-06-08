require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

const MOVIE_ROOT_IDS = [
  'english-movies',
  'hindi-movies',
  'hindi-dubbed-movies',
  'new-movies-1',
  'new-movies-2',
  'south-indian-movies',
  'extra-storage-bangla-movies',
  '3d-movies',
  'other-foreign-movies'
];

async function main() {
  await ensureContentStore();

  const res = await db.query(
    `SELECT id, 
            payload->>'title' as title, 
            payload->>'sourceRootId' as root_id,
            payload->>'sourcePath' as src_path,
            status
     FROM content_catalog 
     WHERE (payload->>'type' = 'series' OR content_type = 'series')
       AND payload->>'sourceRootId' = ANY($1::text[])
     ORDER BY id ASC`,
    [MOVIE_ROOT_IDS]
  );

  console.log(`=== MISCLASSIFIED SERIES IN MOVIE ROOTS (${res.rowCount}) ===\n`);
  res.rows.forEach(r => {
    console.log(`  id=${r.id} | root=${r.root_id} | status=${r.status} | ${r.title}`);
    console.log(`    path: ${r.src_path}`);
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
