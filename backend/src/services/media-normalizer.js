const path = require('path');
const { spawn } = require('child_process');
const {
  getMediaNormalizerLog,
  getMediaNormalizerState,
  saveMediaNormalizerState,
  getAppState,
  setAppState,
} = require('../data/store');

const scriptPath = path.resolve(__dirname, '../../scripts/normalize-media-library.js');

function isProcessAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function getStatus() {
  const state = await getMediaNormalizerState();
  const lock = state?.lock || null;
  const lastUpdatedMs = new Date(state?.updatedAt || 0).getTime();
  // Assume process is dead if no heartbeat in 10 minutes, even if PID exists
  const isStale = (Date.now() - lastUpdatedMs) > 10 * 60 * 1000; 
  
  let running = false;
  if (lock?.pid) {
    if (isStale) {
      running = false;
    } else {
      running = isProcessAlive(Number(lock.pid));
    }
  }

  return {
    running,
    lock,
    state,
    recentLogLines: await getMediaNormalizerLog(25),
  };
}

let startLock = false;

async function start() {
  if (startLock) {
    return { started: false, reason: 'start-in-progress', status: await getStatus() };
  }

  startLock = true;
  try {
    const current = await getStatus();
    if (current.running) {
      return { started: false, reason: 'already-running', status: current };
    }

    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: 'ignore',
      cwd: path.resolve(__dirname, '../..'),
      env: process.env,
    });
    child.unref();

    const state = await getMediaNormalizerState();
    await saveMediaNormalizerState({
      ...(state || {}),
      lock: {
        pid: child.pid,
        startedAt: new Date().toISOString(),
      },
    });

    return { started: true, status: await getStatus() };
  } finally {
    startLock = false;
  }
}

async function stop() {
  const current = await getStatus();
  if (!current.running || !current.lock?.pid) {
    return { stopped: false, reason: 'not-running', status: current };
  }

  const pid = Number(current.lock.pid);
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { detached: true, stdio: 'ignore' }).unref();
  } else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
  }

  const nextState = await getMediaNormalizerState();
  await saveMediaNormalizerState({
    ...(nextState || {}),
    lock: null,
  });

  return { stopped: true, signaledPid: pid, status: await getStatus() };
}

async function retryFile(filePath) {
  const state = await getMediaNormalizerState();
  if (!state) {
    return { retried: false, reason: 'no-state' };
  }

  const cleaned = [];
  if (state.failed?.[filePath]) {
    delete state.failed[filePath];
    cleaned.push('failed');
  }
  if (state.processed?.[filePath]) {
    delete state.processed[filePath];
    cleaned.push('processed');
  }
  // Also handle .mp4 variant if the original was .mkv etc.
  const mp4Path = filePath.replace(/\.\w+$/, '.mp4');
  if (mp4Path !== filePath && state.processed?.[mp4Path]) {
    delete state.processed[mp4Path];
    if (!cleaned.includes('processed')) cleaned.push('processed');
  }

  await saveMediaNormalizerState({
    ...state,
    updatedAt: new Date().toISOString(),
  });

  return {
    retried: true,
    filePath,
    cleaned,
    status: await getStatus(),
  };
}

const CONFIG_KEY = 'media_normalizer_config';

function getDefaultConfig() {
  return {
    crf: Number(process.env.MEDIA_NORMALIZER_CRF || 19),
    preset: process.env.MEDIA_NORMALIZER_PRESET || 'medium',
    concurrency: Number(process.env.MEDIA_NORMALIZER_MAX_CONCURRENCY || ''),
  };
}

async function getConfig() {
  const cfg = await getAppState(CONFIG_KEY);
  const defaults = getDefaultConfig();
  return { ...defaults, ...(cfg || {}) };
}

async function setConfig(updates) {
  const current = await getConfig();
  const merged = { ...current, ...updates };
  // Validate
  if (merged.crf !== undefined) {
    const crf = Number(merged.crf);
    if (crf < 0 || crf > 51 || !Number.isFinite(crf)) {
      const err = new Error('CRF must be a number between 0 and 51');
      err.statusCode = 400;
      throw err;
    }
    merged.crf = crf;
  }
  if (merged.preset !== undefined) {
    const valid = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow', 'placebo'];
    if (!valid.includes(String(merged.preset).toLowerCase())) {
      const err = new Error(`Preset must be one of: ${valid.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    merged.preset = String(merged.preset).toLowerCase();
  }
  if (merged.concurrency !== undefined) {
    const cc = Number(merged.concurrency);
    if (cc < 1 || cc > 8 || !Number.isFinite(cc)) {
      const err = new Error('Concurrency must be between 1 and 8');
      err.statusCode = 400;
      throw err;
    }
    merged.concurrency = cc;
  }
  await setAppState(CONFIG_KEY, merged);
  return merged;
}

module.exports = {
  getMediaNormalizerStatus: getStatus,
  startMediaNormalizer: start,
  stopMediaNormalizer: stop,
  retryMediaNormalizerFile: retryFile,
  getNormalizerConfig: getConfig,
  setNormalizerConfig: setConfig,
};
