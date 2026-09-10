const { db, ensureContentStore, getAppState, setAppState } = require('../data/store/base');

const SETTINGS_KEY = 'media_fixer_settings';
const LAST_SCAN_KEY = 'media_last_scan';

const DEFAULT_SETTINGS = {
  autoFix: false,
  autoPreset: 'browser',
  autoMaxJobs: 10,
};

let tablesReadyPromise = null;

async function ensureMediaTables() {
  await ensureContentStore();
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS transcode_jobs (
          id TEXT PRIMARY KEY,
          item_id BIGINT,
          item_title TEXT NOT NULL DEFAULT '',
          target_key TEXT NOT NULL DEFAULT '',
          target_label TEXT NOT NULL DEFAULT '',
          season INT,
          episode INT,
          source_path TEXT NOT NULL DEFAULT '',
          backup_path TEXT NOT NULL DEFAULT '',
          preset TEXT NOT NULL DEFAULT 'browser',
          options JSONB NOT NULL DEFAULT '{}',
          plan JSONB NOT NULL DEFAULT '{}',
          verdict TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'queued',
          progress JSONB NOT NULL DEFAULT '{}',
          error TEXT NOT NULL DEFAULT '',
          log_tail JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          started_at TIMESTAMPTZ,
          finished_at TIMESTAMPTZ
        )
      `);
      await db.query('CREATE INDEX IF NOT EXISTS idx_transcode_jobs_status ON transcode_jobs (status)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_transcode_jobs_created ON transcode_jobs (created_at DESC)');

      // Jobs that were mid-flight during a restart/deploy can never finish — mark them.
      await db.query(
        `UPDATE transcode_jobs SET status = 'interrupted', finished_at = NOW(),
         error = 'Interrupted by server restart/deploy. Use Retry to run again.'
         WHERE status IN ('queued', 'running')`
      );
    })().catch((error) => {
      tablesReadyPromise = null;
      throw error;
    });
  }
  return tablesReadyPromise;
}

function toRecord(job) {
  return {
    id: job.id,
    item_id: job.itemId ?? null,
    item_title: job.itemTitle || '',
    target_key: job.targetKey || '',
    target_label: job.targetLabel || '',
    season: job.season ?? null,
    episode: job.episode ?? null,
    source_path: job.sourcePath || '',
    backup_path: job.backupPath || '',
    preset: job.preset || 'browser',
    options: JSON.stringify(job.options || {}),
    plan: JSON.stringify(job.plan || {}),
    verdict: job.verdict || '',
    status: job.status,
    progress: JSON.stringify(job.progress || {}),
    error: job.error || '',
    log_tail: JSON.stringify((job.logLines || []).slice(-25)),
    started_at: job.startedAt || null,
    finished_at: job.finishedAt || null,
  };
}

async function saveJobRecord(job) {
  await ensureMediaTables();
  const r = toRecord(job);
  const cols = Object.keys(r);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const updates = cols.filter((c) => c !== 'id' && c !== 'created_at').map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  await db.query(
    `INSERT INTO transcode_jobs (${cols.join(', ')}) VALUES (${placeholders})
     ON CONFLICT (id) DO UPDATE SET ${updates}`,
    cols.map((c) => r[c])
  );
}

async function updateJobRecord(id, patch) {
  await ensureMediaTables();
  const allowed = ['status', 'progress', 'error', 'log_tail', 'backup_path', 'started_at', 'finished_at', 'plan', 'verdict'];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (entries.length === 0) return;
  const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  await db.query(`UPDATE transcode_jobs SET ${sets} WHERE id = $1`, [id, ...values]);
}

function rowToHistory(row) {
  let options = {};
  let plan = null;
  let progress = { percent: 0, outTimeSec: 0, speed: '', etaSec: null };
  let logTail = [];
  try { options = typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || {}); } catch { /* ignore */ }
  try { plan = typeof row.plan === 'string' ? JSON.parse(row.plan) : (row.plan || null); } catch { /* ignore */ }
  try { progress = typeof row.progress === 'string' ? JSON.parse(row.progress) : (row.progress || progress); } catch { /* ignore */ }
  try { logTail = typeof row.log_tail === 'string' ? JSON.parse(row.log_tail) : (row.log_tail || []); } catch { /* ignore */ }
  return {
    id: row.id,
    status: row.status,
    itemId: row.item_id,
    itemTitle: row.item_title,
    targetKey: row.target_key,
    targetLabel: row.target_label,
    season: row.season,
    episode: row.episode,
    sourcePath: row.source_path,
    backupPath: row.backup_path || undefined,
    preset: row.preset,
    options,
    plan,
    verdict: row.verdict || null,
    durationSec: 0,
    progress,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    error: row.error || null,
    logTail: Array.isArray(logTail) ? logTail : [],
    fromHistory: true,
  };
}

async function listJobHistory(limit = 50) {
  await ensureMediaTables();
  const result = await db.query('SELECT * FROM transcode_jobs ORDER BY created_at DESC LIMIT $1', [Math.max(1, Math.min(200, Number(limit) || 50))]);
  return result.rows.map(rowToHistory);
}

async function getJobRecord(id) {
  await ensureMediaTables();
  const result = await db.query('SELECT * FROM transcode_jobs WHERE id = $1 LIMIT 1', [id]);
  if (result.rows.length === 0) return null;
  return rowToHistory(result.rows[0]);
}

async function getSettings() {
  const stored = await getAppState(SETTINGS_KEY, null);
  return { ...DEFAULT_SETTINGS, ...(stored || {}) };
}

async function saveSettings(patch) {
  const current = await getSettings();
  const next = {
    autoFix: Boolean(patch.autoFix ?? current.autoFix),
    autoPreset: ['browser', 'browser-720p', 'audio-only'].includes(patch.autoPreset) ? patch.autoPreset : current.autoPreset,
    autoMaxJobs: Math.max(1, Math.min(50, Number(patch.autoMaxJobs ?? current.autoMaxJobs) || 10)),
  };
  await setAppState(SETTINGS_KEY, next);
  return next;
}

async function getLastScanReport() {
  return getAppState(LAST_SCAN_KEY, null);
}

async function saveLastScanReport(report) {
  await setAppState(LAST_SCAN_KEY, report);
  return report;
}

module.exports = {
  ensureMediaTables,
  saveJobRecord,
  updateJobRecord,
  listJobHistory,
  getJobRecord,
  getSettings,
  saveSettings,
  getLastScanReport,
  saveLastScanReport,
};
