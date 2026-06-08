const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/database');
const { loadScannerRoots, recalculateDuplicateCounts } = require('../src/data/store');

async function run() {
  console.log('Loading active scanner roots...');
  const rootsResult = await db.query('SELECT id, scan_path as "scanPath" FROM scanner_roots WHERE enabled = true');
  const roots = rootsResult.rows;
  const activeRootsMap = new Map();
  
  for (const root of roots) {
    if (root && root.scanPath && fs.existsSync(root.scanPath)) {
      activeRootsMap.set(String(root.id), root.scanPath);
    }
  }
  
  console.log('Active (online) roots: ' + Array.from(activeRootsMap.keys()).join(', '));
  
  if (activeRootsMap.size === 0) {
    console.log('No active roots found on disk. Exiting to prevent accidental deletions.');
    process.exit(0);
  }

  console.log('Querying scanner items from the catalog...');
  const queryResult = await db.query(
    "SELECT id, payload FROM content_catalog WHERE source_type = 'scanner' ORDER BY id"
  );
  
  console.log('Found ' + queryResult.rows.length + ' scanner items in database.');
  
  let deletedCount = 0;
  
  for (let i = 0; i < queryResult.rows.length; i++) {
    const row = queryResult.rows[i];
    const item = row.payload;
    if (!item) continue;
    
    const rootId = String(item.sourceRootId || '');
    if (!activeRootsMap.has(rootId)) {
      continue;
    }
    
    const sourcePath = item.sourcePath;
    if (!sourcePath) continue;
    
    const exists = fs.existsSync(sourcePath);
    if (!exists) {
      console.log('  [STALE] ID: ' + item.id + ' | Title: ' + item.title + ' | Path: ' + sourcePath + ' does not exist. Deleting...');
      await db.query('DELETE FROM content_catalog WHERE id = $1', [row.id]);
      deletedCount++;
    }
  }
  
  console.log('Deleted ' + deletedCount + ' stale catalog items.');
  
  if (deletedCount > 0) {
    console.log('Recalculating duplicate counts in database...');
    const recap = await recalculateDuplicateCounts();
    console.log('Duplicate counts updated: ' + JSON.stringify(recap));
  }
  
  console.log('Done.');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
