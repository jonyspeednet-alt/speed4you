require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { reconcileMovieRoot, reconcileSeriesRoot } = require('./reconcile-scanner-library');

async function main() {
  console.log('[normalizer] Starting media library normalization...');
  const { ensureContentStore, loadScannerRoots } = require('../src/data/store');
  await ensureContentStore();
  const roots = loadScannerRoots();
  const summary = {
    startedAt: new Date().toISOString(),
    roots: roots.length,
    processed: 0, created: 0, updated: 0, deleted: 0,
    rootCounts: {},
  };

  for (const root of roots) {
    if (!root?.scanPath) continue;
    let exists = false;
    try { exists = require('fs').existsSync(root.scanPath); } catch { exists = false; }
    if (!exists) {
      console.log(`[normalizer] SKIP (missing path): ${root.id}`);
      continue;
    }
    if (root.type === 'series') {
      await reconcileSeriesRoot(root, summary);
    } else {
      await reconcileMovieRoot(root, summary);
    }
    console.log(`[normalizer] ${root.id} processed=${summary.rootCounts[root.id] || 0}`);
  }

  summary.completedAt = new Date().toISOString();
  console.log('[normalizer] Complete:', JSON.stringify(summary, null, 2));
}

main().catch(err => { console.error('[normalizer] Fatal:', err); process.exit(1); });
