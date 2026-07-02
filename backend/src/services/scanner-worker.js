const { scanSelectedRoots, requestScanAbort } = require('./scanner');
const { ensureContentStore } = require('../data/store');

// Orphan protection: if the parent server dies, the IPC channel disconnects — exit rather than
// keep scanning (and writing to the DB) as an orphaned process.
process.on('disconnect', () => process.exit(0));

// Graceful stop: on SIGTERM (sent by stopScanJob), stop cooperatively between roots so the
// current root can finalize instead of being force-killed mid-write. The parent applies a
// SIGKILL fallback if this takes too long.
process.on('SIGTERM', () => {
  requestScanAbort();
});

function loadRootIds() {
  try {
    return JSON.parse(process.env.SCANNER_ROOT_IDS || '[]');
  } catch {
    return [];
  }
}

async function run() {
  try {
    await ensureContentStore();
    const summary = await scanSelectedRoots(loadRootIds(), (progressSummary) => {
      if (process.send) {
        process.send({ type: 'progress', summary: progressSummary });
      }
    }, {
      runId: process.env.SCANNER_RUN_ID || '',
    });

    if (process.send) {
      process.send({ type: 'completed', summary });
    }
    process.exit(0);
  } catch (error) {
    if (process.send) {
      process.send({ type: 'failed', error: error.message });
    }
    process.exit(1);
  }
}

run();
