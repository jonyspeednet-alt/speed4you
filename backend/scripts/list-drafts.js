require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');

async function main() {
  await ensureContentStore();

  // Get ALL draft items with details
  const drafts = await db.query(
    `SELECT id, 
            payload->>'title' as title, 
            payload->>'type' as content_type,
            payload->>'year' as yr, 
            payload->>'sourceRootId' as root_id,
            payload->>'sourcePath' as src_path,
            payload->>'videoUrl' as video_url,
            payload->>'scanSignature' as scan_sig,
            payload->>'metadataStatus' as meta_status,
            payload->>'category' as cat,
            payload->>'language' as lang
     FROM content_catalog 
     WHERE status = 'draft' 
     ORDER BY id ASC`
  );

  console.log(`=== ALL DRAFT ITEMS (${drafts.rowCount}) ===\n`);
  
  const groups = {};
  drafts.rows.forEach(r => {
    const key = r.root_id || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  for (const [rootId, items] of Object.entries(groups)) {
    console.log(`--- Root: ${rootId} (${items.length} items) ---`);
    items.forEach(r => {
      console.log(`  id=${r.id} | type=${r.content_type} | meta=${r.meta_status} | cat=${r.cat} | ${r.title}`);
      if (r.src_path) console.log(`    path: ${r.src_path}`);
    });
    console.log('');
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
