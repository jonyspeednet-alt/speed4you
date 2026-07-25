const ACTIVE_USER_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 30 * 1000; // 30 seconds

const activeUsers = new Map();

let cleanupTimer = null;

function fingerprintKey(ip, userAgent) {
  const raw = `${ip}:${userAgent || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function trackActiveUser(ip, userAgent) {
  if (!ip) return;
  const key = fingerprintKey(ip, userAgent);
  activeUsers.set(key, Date.now());
}

function getActiveUserCount() {
  const now = Date.now();
  let count = 0;
  for (const lastSeen of activeUsers.values()) {
    if (now - lastSeen <= ACTIVE_USER_TTL_MS) {
      count++;
    }
  }
  return count;
}

function cleanupExpiredUsers() {
  const now = Date.now();
  for (const [key, lastSeen] of activeUsers) {
    if (now - lastSeen > ACTIVE_USER_TTL_MS) {
      activeUsers.delete(key);
    }
  }
}

function startActiveUserCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredUsers, CLEANUP_INTERVAL_MS);
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

function stopActiveUserCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

module.exports = {
  trackActiveUser,
  getActiveUserCount,
  startActiveUserCleanup,
  stopActiveUserCleanup,
};
