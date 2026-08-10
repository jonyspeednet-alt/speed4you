require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');

async function main() {
  console.log('=== CHECKING DRIDAM MOVE RESULT ===\n');

  // 1. Check by old ID 27561
  const byId = await query(`
    SELECT id, title, status, metadata_status, source_root_id,
           payload->>'sourcePath' AS source_path,
           payload->>'videoUrl' AS video_url,
           payload->>'tmdbId' AS tmdb_id,
           created_at, updated_at
    FROM content_catalog WHERE id = 27561
  `);

  if (byId.rows.length > 0) {
    const r = byId.rows[0];
    console.log('Old record (ID:27561) still exists:');
    console.log('  title        :', r.title);
    console.log('  sourcePath   :', r.source_path);
    console.log('  videoUrl     :', r.video_url);
    console.log('  sourceRootId :', r.source_root_id);
    console.log('  status       :', r.status);
    console.log('  updatedAt    :', r.updated_at);

    // Check if old path exists on disk
    const diskExists = r.source_path ? fs.existsSync(r.source_path) : false;
    console.log('  disk exists  :', diskExists, r.source_path);
  } else {
    console.log('Old record (ID:27561) was DELETED from DB!');
  }

  // 2. Search for any Dridam entry (new or old)
  const byTitle = await query(`
    SELECT id, title, status, metadata_status, source_root_id,
           payload->>'sourcePath' AS source_path,
           payload->>'videoUrl' AS video_url,
           created_at, updated_at
    FROM content_catalog
    WHERE title ILIKE '%dridam%'
    ORDER BY id
  `);

  console.log(`\nAll Dridam entries in DB (${byTitle.rows.length} found):`);
  for (const r of byTitle.rows) {
    const diskExists = r.source_path ? fs.existsSync(r.source_path) : false;
    console.log(`  ID:${r.id} | title:"${r.title}" | root:${r.source_root_id}`);
    console.log(`    sourcePath: ${r.source_path}`);
    console.log(`    disk:${diskExists} | status:${r.status} | updated:${r.updated_at}`);
  }

  // 3. Check if old path still exists on disk
  const oldPath = '/var/www/html/Hindi_Dubbed_Movies/2026/Dridam (2026).mkv';
  const newPath = '/var/www/html/Other_Foreign_Movies/2026/Dridam (2026).mkv';
  console.log('\nDisk check:');
  console.log('  Old path (Hindi_Dubbed) exists:', fs.existsSync(oldPath));
  console.log('  New path (Other_Foreign) exists:', fs.existsSync(newPath));

  process.exit(0);
}
main().catch(console.error);
