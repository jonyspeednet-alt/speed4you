const path = require('path');
const { ensureContentStore, db } = require('../data/store/base');
const content = require('../data/store/content');

function toPublicUrl(root, absolutePath) {
  const relativePath = path.relative(root.scanPath, absolutePath).split(path.sep).join('/');
  return `${root.publicBaseUrl}/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}

async function run() {
  await ensureContentStore();

  console.log('Fetching scanner roots...');
  const rootsRes = await db.query('SELECT id, label, scan_path, public_base_url, type FROM scanner_roots');
  const rootsMap = {};
  for (const row of rootsRes.rows) {
    rootsMap[row.id] = {
      id: row.id,
      label: row.label,
      scanPath: row.scan_path,
      publicBaseUrl: row.public_base_url,
      type: row.type,
    };
    console.log(`  Root: ${row.id} -> ${row.scan_path}`);
  }

  console.log('Fetching all catalog items...');
  const itemsRes = await db.query('SELECT id, payload FROM content_catalog');
  console.log(`Found ${itemsRes.rows.length} items to inspect.`);

  let updatedCount = 0;
  let itemsSkipped = 0;

  for (const row of itemsRes.rows) {
    const item = row.payload;
    const itemId = row.id;
    let modified = false;

    if (item.sourceType !== 'scanner' || !item.sourceRootId) {
      itemsSkipped++;
      continue;
    }

    const root = rootsMap[item.sourceRootId];
    if (!root) {
      console.warn(`Warning: Scanner root ${item.sourceRootId} not found for item ${itemId} (${item.title})`);
      itemsSkipped++;
      continue;
    }

    if (item.contentType === 'series' || item.type === 'series') {
      if (Array.isArray(item.seasons)) {
        for (let sIdx = 0; sIdx < item.seasons.length; sIdx++) {
          const season = item.seasons[sIdx];
          if (Array.isArray(season.episodes)) {
            for (let eIdx = 0; eIdx < season.episodes.length; eIdx++) {
              const ep = season.episodes[eIdx];
              if (ep.sourcePath && ep.sourcePath.includes('%')) {
                const correctedUrl = toPublicUrl(root, ep.sourcePath);
                if (ep.videoUrl !== correctedUrl) {
                  console.log(`[Series ${itemId}] Episode S${season.number}E${ep.number} URL updated:`);
                  console.log(`  Old: ${ep.videoUrl}`);
                  console.log(`  New: ${correctedUrl}`);
                  ep.videoUrl = correctedUrl;
                  modified = true;
                }
              }
            }
          }
        }
      }
    } else {
      // Movie or foreign content
      if (item.sourcePath && item.sourcePath.includes('%')) {
        const correctedUrl = toPublicUrl(root, item.sourcePath);
        if (item.videoUrl !== correctedUrl) {
          console.log(`[Movie ${itemId}] URL updated:`);
          console.log(`  Old: ${item.videoUrl}`);
          console.log(`  New: ${correctedUrl}`);
          item.videoUrl = correctedUrl;
          item.sourcePublicPath = correctedUrl;
          modified = true;
        }
      }
    }

    if (modified) {
      await db.query('UPDATE content_catalog SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2', [JSON.stringify(item), itemId]);
      updatedCount++;
    } else {
      itemsSkipped++;
    }
  }

  console.log(`\nMigration completed:`);
  console.log(`  Updated: ${updatedCount} items`);
  console.log(`  Skipped/No change: ${itemsSkipped} items`);

  console.log('Recalculating duplicate counts...');
  const dupResult = await content.recalculateDuplicateCounts();
  console.log(`  Recalculated duplicates: ${dupResult.updated} of ${dupResult.total} items`);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
