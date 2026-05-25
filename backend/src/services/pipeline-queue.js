const { getAppState, setAppState } = require('../data/store');
const logger = require('../utils/logger');

const QUEUE_KEY = 'pipeline_queue';
const LOCK_KEY = 'pipeline_lock';
const LOG_KEY = 'pipeline_log';

function now() {
  return new Date().toISOString();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function getQueue() {
  const state = await getAppState(QUEUE_KEY);
  return state || { scannerQueue: [], normalizerQueue: [], stats: { discovered: 0, native: 0, normalized: 0, published: 0, drafts: 0, failed: 0 } };
}

async function saveQueue(state) {
  await setAppState(QUEUE_KEY, state);
}

async function getPipelineLock() {
  return getAppState(LOCK_KEY, null, true);
}

async function setPipelineLock(lock) {
  await setAppState(LOCK_KEY, lock);
}

async function releasePipelineLock() {
  await setAppState(LOCK_KEY, null);
}

async function appendLog(message) {
  const existing = await getAppState(LOG_KEY);
  const lines = Array.isArray(existing) ? existing : [];
  lines.push({ message, timestamp: now() });
  if (lines.length > 1000) lines.splice(0, lines.length - 1000);
  await setAppState(LOG_KEY, lines);
}

async function getLog(limit) {
  const existing = await getAppState(LOG_KEY);
  const lines = Array.isArray(existing) ? existing : [];
  return limit ? lines.slice(-limit) : lines;
}

async function getScannerLock() { return getAppState('scanner_lock', null, true); }
async function setScannerLock(lock) { await setAppState('scanner_lock', lock); }
async function releaseScannerLock() { await setAppState('scanner_lock', null); }

async function getNormalizerLock() { return getAppState('normalizer_lock', null, true); }
async function setNormalizerLock(lock) { await setAppState('normalizer_lock', lock); }
async function releaseNormalizerLock() { await setAppState('normalizer_lock', null); }

async function isScannerPaused() { return getAppState('scanner_paused') || false; }
async function setScannerPaused(v) { await setAppState('scanner_paused', Boolean(v)); }
async function isNormalizerPaused() { return getAppState('normalizer_paused') || false; }
async function setNormalizerPaused(v) { await setAppState('normalizer_paused', Boolean(v)); }

async function clearAll() {
  await setAppState(QUEUE_KEY, null);
  await setAppState(LOCK_KEY, null);
  await setAppState(LOG_KEY, null);
  await setAppState('scanner_lock', null);
  await setAppState('normalizer_lock', null);
  await setAppState('scanner_paused', null);
  await setAppState('normalizer_paused', null);
}

async function enqueueScannerItems(files) {
  const state = await getQueue();
  const existingPaths = new Set([
    ...state.scannerQueue.map(x => x.filePath),
    ...state.normalizerQueue.map(x => x.filePath),
  ]);
  let added = 0;
  for (const f of files) {
    if (!existingPaths.has(f.filePath)) {
      state.scannerQueue.push({
        id: uid(),
        filePath: f.filePath,
        root: f.root,
        extension: f.extension,
        size: f.size,
        status: 'pending',
        strategy: null,
        error: null,
        probeResult: null,
        createdAt: now(),
        updatedAt: now(),
      });
      existingPaths.add(f.filePath);
      added++;
    }
  }
  state.stats.discovered += added;
  await saveQueue(state);
  return added;
}

async function dequeueScannerItem() {
  const state = await getQueue();
  const idx = state.scannerQueue.findIndex(x => x.status === 'pending' || x.status === 'failed');
  if (idx === -1) return null;
  state.scannerQueue[idx].status = 'processing';
  state.scannerQueue[idx].startedAt = now();
  state.scannerQueue[idx].updatedAt = now();
  await saveQueue(state);
  return state.scannerQueue[idx];
}

async function completeScannerItem(id, result) {
  const state = await getQueue();
  const item = state.scannerQueue.find(x => x.id === id);
  if (!item) return;
  item.status = result.status || 'completed';
  item.strategy = result.strategy;
  item.probeResult = result.probeResult || null;
  item.error = result.error || null;
  item.updatedAt = now();
  item.completedAt = now();
  if (result.status === 'completed') state.stats.native += 1;
  if (result.status === 'failed') state.stats.failed += 1;
  await saveQueue(state);
}

async function moveScannerItemToNormalizer(id, strategy) {
  const state = await getQueue();
  const item = state.scannerQueue.find(x => x.id === id);
  if (!item) return;
  item.status = 'normalizer-queued';
  item.strategy = strategy;
  item.updatedAt = now();
  state.normalizerQueue.push({
    id: uid(),
    filePath: item.filePath,
    root: item.root,
    extension: item.extension,
    size: item.size,
    strategy,
    status: 'pending',
    error: null,
    probeResult: item.probeResult,
    createdAt: now(),
    updatedAt: now(),
  });
  await saveQueue(state);
}

async function dequeueNormalizerItem() {
  const state = await getQueue();
  const idx = state.normalizerQueue.findIndex(x => x.status === 'pending' || x.status === 'failed');
  if (idx === -1) return null;
  state.normalizerQueue[idx].status = 'processing';
  state.normalizerQueue[idx].startedAt = now();
  state.normalizerQueue[idx].updatedAt = now();
  await saveQueue(state);
  return state.normalizerQueue[idx];
}

async function completeNormalizerItem(id, result) {
  const state = await getQueue();
  const item = state.normalizerQueue.find(x => x.id === id);
  if (!item) return;
  item.status = result.status || 'completed';
  item.error = result.error || null;
  item.metadataStatus = result.metadataStatus;
  item.catalogItemId = result.catalogItemId;
  item.updatedAt = now();
  item.completedAt = now();
  if (result.status === 'completed') state.stats.normalized += 1;
  if (result.status === 'failed') state.stats.failed += 1;
  await saveQueue(state);
}

async function getQueueStatus() {
  const state = await getQueue();
  return {
    scanner: {
      total: state.scannerQueue.length,
      pending: state.scannerQueue.filter(x => x.status === 'pending').length,
      processing: state.scannerQueue.filter(x => x.status === 'processing').length,
      completed: state.scannerQueue.filter(x => x.status === 'completed').length,
      failed: state.scannerQueue.filter(x => x.status === 'failed').length,
      normalizerQueued: state.scannerQueue.filter(x => x.status === 'normalizer-queued').length,
    },
    normalizer: {
      total: state.normalizerQueue.length,
      pending: state.normalizerQueue.filter(x => x.status === 'pending').length,
      processing: state.normalizerQueue.filter(x => x.status === 'processing').length,
      completed: state.normalizerQueue.filter(x => x.status === 'completed').length,
      failed: state.normalizerQueue.filter(x => x.status === 'failed').length,
    },
    stats: state.stats,
  };
}

async function getScannerQueue(limit) {
  const state = await getQueue();
  const items = state.scannerQueue;
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return limit ? items.slice(0, limit) : items;
}

async function getNormalizerQueue(limit) {
  const state = await getQueue();
  const items = state.normalizerQueue;
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return limit ? items.slice(0, limit) : items;
}

async function retryScannerItem(id) {
  const state = await getQueue();
  const item = state.scannerQueue.find(x => x.id === id);
  if (!item) return false;
  item.status = 'pending';
  item.error = null;
  item.updatedAt = now();
  await saveQueue(state);
  return true;
}

async function retryNormalizerItem(id) {
  const state = await getQueue();
  const item = state.normalizerQueue.find(x => x.id === id);
  if (!item) return false;
  item.status = 'pending';
  item.error = null;
  item.updatedAt = now();
  await saveQueue(state);
  return true;
}

async function retryAllFailed() {
  const state = await getQueue();
  for (const item of state.scannerQueue) {
    if (item.status === 'failed') { item.status = 'pending'; item.error = null; item.updatedAt = now(); }
  }
  for (const item of state.normalizerQueue) {
    if (item.status === 'failed') { item.status = 'pending'; item.error = null; item.updatedAt = now(); }
  }
  await saveQueue(state);
}

module.exports = {
  getQueue, saveQueue, clearAll, appendLog, getLog,
  getPipelineLock, setPipelineLock, releasePipelineLock,
  getScannerLock, setScannerLock, releaseScannerLock,
  getNormalizerLock, setNormalizerLock, releaseNormalizerLock,
  isScannerPaused, setScannerPaused,
  isNormalizerPaused, setNormalizerPaused,
  enqueueScannerItems, dequeueScannerItem, completeScannerItem,
  moveScannerItemToNormalizer,
  dequeueNormalizerItem, completeNormalizerItem,
  getQueueStatus, getScannerQueue, getNormalizerQueue,
  retryScannerItem, retryNormalizerItem, retryAllFailed,
};
