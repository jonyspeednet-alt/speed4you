require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

async function main() {
  await ensureContentStore();
  const res = await db.query(
    `SELECT COUNT(*) as total,
            COUNT(CASE WHEN updated_at > NOW() - INTERVAL '3 minutes' THEN 1 END) as updated_recently,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '3 minutes' THEN 1 END) as created_recently,
            COUNT(CASE WHEN status='published' THEN 1 END) as published,
            COUNT(CASE WHEN status='draft' THEN 1 END) as drafts
     FROM content_catalog`
  );
  console.log(JSON.stringify(res.rows[0], null, 2));

  // Let's also see the latest 5 items updated/created recently
  const items = await db.query(
    `SELECT id, payload->>'title' as title, payload->>'type' as type, updated_at, status
     FROM content_catalog
     WHERE updated_at > NOW() - INTERVAL '3 minutes'
     ORDER BY updated_at DESC
     LIMIT 5`
  );
  if (items.rows.length) {
    console.log('\nRecently updated items:');
    items.rows.forEach(r => console.log(`  id=${r.id} | type=${r.type} | status=${r.status} | title=${r.title} | updated=${r.updated_at}`));
  } else {
    console.log('\nNo items updated in the last 3 minutes.');
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
