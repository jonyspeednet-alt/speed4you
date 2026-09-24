const { execFileSync } = require('child_process');
const logger = require('./logger');

// Monitors the root filesystem so a full disk never again silently kills
// large downloads (nginx proxy temp writes fail with ENOSPC, Chrome shows
// "Failed - Network error"). Surfaced via /health and /api/admin/dashboard,
// with server-side log alerts on status transitions.
const CACHE_TTL_MS = 60 * 1000;
const MONITORED_PATH = '/';

let cache = { at: 0, value: { path: MONITORED_PATH, status: 'unknown' } };
let lastAlertedStatus = 'ok';

function warnPercent() {
  const value = Number(process.env.DISK_WARN_PERCENT || 85);
  return Number.isFinite(value) ? value : 85;
}

function critPercent() {
  const value = Number(process.env.DISK_CRIT_PERCENT || 93);
  return Number.isFinite(value) ? value : 93;
}

function parseDfOutput(output) {
  // Expected: `df -k -P /` → header line + exactly one data line:
  // Filesystem 1024-blocks Used Available Capacity Mounted on
  const lines = String(output || '').trim().split('\n');
  if (lines.length < 2) return null;
  const parts = lines[1].trim().split(/\s+/);
  if (parts.length < 6) return null;
  const totalKb = Number(parts[1]);
  const usedKb = Number(parts[2]);
  const availKb = Number(parts[3]);
  const usePercent = parseInt(String(parts[4]).replace('%', ''), 10);
  if (![totalKb, usedKb, availKb, usePercent].every(Number.isFinite)) return null;
  return {
    totalBytes: totalKb * 1024,
    usedBytes: usedKb * 1024,
    freeBytes: availKb * 1024,
    usePercent,
  };
}

function statusForUsePercent(usePercent) {
  if (!Number.isFinite(usePercent)) return 'unknown';
  if (usePercent >= critPercent()) return 'critical';
  if (usePercent >= warnPercent()) return 'warning';
  return 'ok';
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const scaled = value / 1024 ** index;
  return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1)} ${units[index]}`;
}

function readOnce() {
  try {
    const output = execFileSync('df', ['-k', '-P', MONITORED_PATH], { encoding: 'utf8', timeout: 5000 });
    const parsed = parseDfOutput(output);
    if (!parsed) return { path: MONITORED_PATH, status: 'unknown' };
    return { ...parsed, path: MONITORED_PATH, status: statusForUsePercent(parsed.usePercent) };
  } catch {
    return { path: MONITORED_PATH, status: 'unknown' };
  }
}

function getDiskHealth() {
  const now = Date.now();
  if (now - cache.at < CACHE_TTL_MS) return cache.value;
  const value = readOnce();
  cache = { at: now, value };
  if (value.status !== lastAlertedStatus) {
    lastAlertedStatus = value.status;
    const meta = {
      path: value.path,
      usePercent: value.usePercent,
      freeBytes: value.freeBytes,
      freeHuman: value.freeBytes != null ? formatBytes(value.freeBytes) : undefined,
    };
    if (value.status === 'warning') {
      logger.warn('Disk usage high — large downloads may start failing', meta);
    } else if (value.status === 'critical') {
      logger.error('Disk usage CRITICAL — freeing space required, downloads at risk', meta);
    } else if (value.status === 'ok') {
      logger.info('Disk usage back to normal', meta);
    }
  }
  return value;
}

module.exports = {
  getDiskHealth,
  parseDfOutput,
  statusForUsePercent,
  formatBytes,
};
