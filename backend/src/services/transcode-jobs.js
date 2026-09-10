const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { buildTranscodeArgs, probeMediaFile } = require('./media-compat');
const logger = require('../utils/logger');

const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
const MAX_CONCURRENT = Math.max(1, Number(process.env.TRANSCODE_MAX_CONCURRENT || 1));
const JOB_HISTORY_LIMIT = 50;
const PROGRESS_POLL_MS = 1000;

const jobs = new Map(); // jobId -> job
const queue = []; // jobIds waiting to start

function formatGBytes(bytes) {
  const n = Number(bytes || 0);
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.round(n / 1024 ** 2)} MB`;
}

function newJobId() {
  return `trx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    itemId: job.itemId,
    itemTitle: job.itemTitle,
    targetLabel: job.targetLabel,
    sourcePath: job.sourcePath,
    outputPath: job.status === 'done' ? job.sourcePath : undefined,
    backupPath: job.backupPath || undefined,
    preset: job.preset,
    plan: job.plan || null,
    verdict: job.verdict || null,
    durationSec: job.durationSec || 0,
    progress: job.progress || { percent: 0, outTimeSec: 0, speed: '', etaSec: null },
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    finishedAt: job.finishedAt || null,
    error: job.error || null,
    logTail: (job.logLines || []).slice(-25),
  };
}

function appendLog(job, line) {
  const text = String(line || '').trim();
  if (!text) return;
  job.logLines.push(text);
  if (job.logLines.length > 200) job.logLines.splice(0, job.logLines.length - 200);
  if (job.logFile) {
    try {
      fs.appendFileSync(job.logFile, `${text}\n`);
    } catch { /* ignore */ }
  }
}

function readProgressFile(progressFile) {
  let content = '';
  try {
    content = fs.readFileSync(progressFile, 'utf8');
  } catch {
    return null;
  }
  const values = {};
  content.split('\n').forEach((line) => {
    const idx = line.indexOf('=');
    if (idx > 0) values[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return values;
}

function parseFfmpegTime(value) {
  // "01:23:45.678" or microseconds integer from out_time_ms
  if (value === undefined || value === null || value === '') return 0;
  if (/^\d+$/.test(String(value).trim())) return Number(value) / 1000000;
  const match = String(value).trim().match(/^(-?)(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4]));
}

function createJob({ item, target, analysis, presetId }) {
  const { args, plan, preset } = buildTranscodeArgs(analysis, presetId);
  const id = newJobId();
  const dir = path.dirname(analysis.filePath);  const ext = path.extname(analysis.filePath) || '.mkv';
  const base = path.basename(analysis.filePath, ext);
  const tempPath = path.join(dir, `${base}.transcode-${id}${ext}`);
  const progressFile = path.join(os.tmpdir(), `${id}.progress`);
  const logFile = path.join(os.tmpdir(), `${id}.log`);

  // Disk guard: peak usage is ~2x source size (temp output + backup next to original)
  if (typeof fs.statfsSync === 'function' && Number(analysis.sizeBytes || 0) > 0) {
    try {
      const fsStat = fs.statfsSync(dir);
      const freeBytes = Number(fsStat.bfree || 0) * Number(fsStat.bsize || 0);
      const needBytes = Number(analysis.sizeBytes) * 2.2;
      if (freeBytes > 0 && freeBytes < needBytes) {
        const err = new Error(`Not enough disk space for this transcode (need ~${formatGBytes(needBytes)}, free ${formatGBytes(freeBytes)}). Free up space and retry.`);
        err.code = 'NO_SPACE';
        throw err;
      }
    } catch (error) {
      if (error?.code === 'NO_SPACE') throw error;
      // statfs unavailable/failed — proceed; ffmpeg will fail loudly if disk fills
    }
  }

  const job = {
    id,
    status: 'queued',
    itemId: item.id,
    itemTitle: item.title,
    targetKey: target.key,
    targetLabel: target.label,
    sourcePath: analysis.filePath,
    tempPath,
    progressFile,
    logFile,
    logLines: [],
    rawTail: [],
    ffmpegArgs: args,
    preset: preset.id,
    plan,
    verdict: analysis.verdict,
    durationSec: analysis.durationSec || 0,
    progress: { percent: 0, outTimeSec: 0, speed: '', etaSec: null },
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    error: null,
    backupPath: null,
    child: null,
    progressTimer: null,
    finalizing: false,
  };
  jobs.set(id, job);
  queue.push(id);
  appendLog(job, `Job created — preset: ${preset.label}`);
  appendLog(job, `Plan: video ${plan.video}; audio: ${plan.audio.join(' | ')}`);
  pumpQueue();
  return job;
}

function runningCount() {
  let count = 0;
  jobs.forEach((job) => { if (job.status === 'running') count += 1; });
  return count;
}

function pumpQueue() {
  while (runningCount() < MAX_CONCURRENT && queue.length > 0) {
    const id = queue.shift();
    const job = jobs.get(id);
    if (!job || job.status !== 'queued') continue;
    startJob(job);
  }
}

function updateProgress(job) {
  const values = readProgressFile(job.progressFile);
  if (!values) return;
  const outTimeSec = parseFfmpegTime(values.out_time_ms || values.out_time);
  const speed = values.speed ? String(values.speed).trim() : '';
  let percent = 0;
  let etaSec = null;
  if (job.durationSec > 0 && outTimeSec > 0) {
    percent = Math.min(100, (outTimeSec / job.durationSec) * 100);
    const elapsedSec = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
    if (percent > 2 && elapsedSec > 5) {
      etaSec = Math.max(0, Math.round((elapsedSec / percent) * (100 - percent)));
    }
  }
  job.progress = { percent: Math.round(percent * 10) / 10, outTimeSec: Math.round(outTimeSec), speed, etaSec };
  if (values.progress === 'end') {
    job.progress.percent = 100;
  }
}

function startJob(job) {
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  appendLog(job, `Starting ffmpeg (${FFMPEG_BIN})…`);

  // progress file must exist before ffmpeg opens it in append mode on some builds
  try { fs.writeFileSync(job.progressFile, ''); } catch { /* ignore */ }

  // NOTE: output path must be the last arg — ffmpeg treats it as the output file
  const args = [...job.ffmpegArgs, '-nostats', '-progress', job.progressFile, job.tempPath];
  appendLog(job, `Output: ${job.tempPath}`);
  let child;
  try {
    child = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return failJob(job, `Could not start ffmpeg: ${error.message}`);
  }
  job.child = child;

  child.stderr.on('data', (chunk) => {
    String(chunk).split('\n').forEach((line) => {
      const text = line.trim();
      if (!text) return;
      // Unfiltered ring buffer — dumped into the log on failure so the real
      // ffmpeg error is never lost (exit code alone is useless for debugging)
      job.rawTail.push(text.slice(0, 300));
      if (job.rawTail.length > 40) job.rawTail.splice(0, job.rawTail.length - 40);
      // keep interesting lines (errors, stream mapping, time) in the live tail
      if (/error|fail|invalid|mapping|stream|duration|video:|audio:|time=|output|convert|denied|no such|cannot|unable|specified/i.test(text)) {
        appendLog(job, text.slice(0, 300));
      } else if (job.logLines.length < 5) {
        appendLog(job, text.slice(0, 300));
      }
    });
  });

  job.progressTimer = setInterval(() => {
    if (job.status === 'running') updateProgress(job);
  }, PROGRESS_POLL_MS);

  child.on('error', (error) => {
    failJob(job, `ffmpeg process error: ${error.message}`);
  });

  child.on('close', async (code, signal) => {
    if (job.progressTimer) clearInterval(job.progressTimer);
    job.progressTimer = null;
    job.child = null;
    if (job.status === 'cancelled') return; // handled by cancelJob
    if (signal) {
      return failJob(job, `ffmpeg was killed (${signal}).`);
    }
    if (code !== 0) {
      return failJob(job, `ffmpeg exited with code ${code}. See log for details.`);
    }
    try {
      updateProgress(job);
      await finalizeJob(job);
    } catch (error) {
      failJob(job, error.message);
    }
  });
}

function failJob(job, message) {
  if (job.progressTimer) clearInterval(job.progressTimer);
  job.progressTimer = null;
  if (job.child) {
    try { job.child.kill('SIGKILL'); } catch { /* ignore */ }
    job.child = null;
  }
  cleanupTemp(job);
  job.status = 'failed';
  job.error = message;
  job.finishedAt = new Date().toISOString();
  appendLog(job, `FAILED: ${message}`);
  // Surface the last raw ffmpeg lines so the UI log always shows the real cause
  const unseen = (job.rawTail || []).filter((line) => !job.logLines.includes(line)).slice(-15);
  if (unseen.length > 0) {
    appendLog(job, '--- last ffmpeg output ---');
    unseen.forEach((line) => appendLog(job, line));
  }
  try {
    logger.warn('Transcode job failed', { jobId: job.id, itemId: job.itemId, error: message });
  } catch { /* ignore */ }
  pumpQueue();
}

function cleanupTemp(job) {
  [job.tempPath, job.progressFile].forEach((file) => {
    try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
  });
}

function verifyOutput(tempPath, expectedDurationSec) {
  return new Promise((resolve, reject) => {
    let stat;
    try {
      stat = fs.statSync(tempPath);
    } catch {
      return reject(new Error('Transcoded file was not created.'));
    }
    if (!stat.isFile() || stat.size < 1024 * 1024) {
      return reject(new Error('Transcoded file looks broken (too small). Original kept.'));
    }
    probeMediaFile(tempPath).then((probe) => {
      const streams = probe.streams || [];
      const hasVideo = streams.some((s) => s.codec_type === 'video');
      if (!hasVideo) return reject(new Error('Transcoded file has no video stream. Original kept.'));
      const duration = Number(probe.format?.duration || 0);
      if (expectedDurationSec > 0 && duration > 0) {
        const delta = Math.abs(duration - expectedDurationSec);
        if (delta > Math.max(10, expectedDurationSec * 0.05)) {
          return reject(new Error(`Transcoded duration (${Math.round(duration)}s) differs too much from original (${Math.round(expectedDurationSec)}s). Original kept.`));
        }
      }
      resolve({ size: stat.size, duration });
    }).catch((error) => reject(new Error(`Verification failed: ${error.message}. Original kept.`)));
  });
}

async function finalizeJob(job) {
  job.finalizing = true;
  appendLog(job, 'ffmpeg finished — verifying output…');
  await verifyOutput(job.tempPath, job.durationSec);

  const originalMode = (() => {
    try { return fs.statSync(job.sourcePath).mode; } catch { return 0o755; }
  })();

  const backupPath = `${job.sourcePath}.orig-bak`;
  try { if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath); } catch { /* ignore */ }
  fs.renameSync(job.sourcePath, backupPath);
  try {
    fs.renameSync(job.tempPath, job.sourcePath);
  } catch (error) {
    // rollback: restore original
    try { fs.renameSync(backupPath, job.sourcePath); } catch { /* ignore */ }
    throw new Error(`Could not replace original file: ${error.message}. Original restored.`);
  }
  try { fs.chmodSync(job.sourcePath, originalMode); } catch { /* ignore */ }
  try { fs.unlinkSync(job.progressFile); } catch { /* ignore */ }

  job.status = 'done';
  job.backupPath = backupPath;
  job.progress.percent = 100;
  job.progress.etaSec = 0;
  job.finishedAt = new Date().toISOString();
  appendLog(job, `DONE — original replaced. Backup kept at ${backupPath}`);
  try {
    logger.info('Transcode job completed', { jobId: job.id, itemId: job.itemId, target: job.targetLabel });
  } catch { /* ignore */ }
  pumpQueue();
}

function cancelJob(id) {
  const job = jobs.get(id);
  if (!job) {
    const err = new Error('Job not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
    return job;
  }
  if (job.finalizing || (job.status === 'running' && !job.child)) {
    // ffmpeg already exited; the file swap is in progress — too late to cancel safely
    appendLog(job, 'Cancel ignored: job is already finalizing (verifying / replacing file).');
    return job;
  }
  const queuedIndex = queue.indexOf(id);
  if (queuedIndex >= 0) queue.splice(queuedIndex, 1);
  if (job.progressTimer) clearInterval(job.progressTimer);
  job.progressTimer = null;
  if (job.child) {
    try { job.child.kill('SIGKILL'); } catch { /* ignore */ }
    job.child = null;
  }
  cleanupTemp(job);
  job.status = 'cancelled';
  job.finishedAt = new Date().toISOString();
  appendLog(job, 'Cancelled by admin. Temp files cleaned up. Original untouched.');
  pumpQueue();
  return job;
}

function listJobs() {
  return [...jobs.values()]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, JOB_HISTORY_LIMIT)
    .map(publicJob);
}

function getJob(id) {
  const job = jobs.get(id);
  if (!job) {
    const err = new Error('Job not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (job.status === 'running') updateProgress(job);
  return publicJob(job);
}

module.exports = {
  MAX_CONCURRENT,
  createJob,
  cancelJob,
  listJobs,
  getJob,
};
