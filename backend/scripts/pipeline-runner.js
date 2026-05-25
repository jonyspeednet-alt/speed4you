require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { loadScannerRoots } = require('../src/data/store');
const { probeMedia, collectPlaybackProfile, getFfmpegFileArgs } = require('../src/services/player-media');
const { enrichItemWithMetadata } = require('../src/services/metadata-enricher');
const { upsertScannedItem, refreshCatalogReferencesForNormalizedFile } = require('../src/data/store');
const queue = require('../src/services/pipeline-queue');
const logger = require('../src/utils/logger');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.mpg', '.mpeg', '.ts', '.m2ts', '.flv']);
const TARGET_VIDEO_CODECS = new Set(['h264', 'avc1']);
const TARGET_AUDIO_CODECS = new Set(['aac', 'mp4a']);

let isShuttingDown = false;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function* walkVideoFiles(rootPath) {
  const queue = [rootPath];
  while (queue.length > 0) {
    const current = queue.shift();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) queue.push(absPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (VIDEO_EXTENSIONS.has(ext)) {
        let stat;
        try { stat = fs.statSync(absPath); } catch { continue; }
        yield { filePath: absPath, extension: ext, size: stat.size };
      }
    }
  }
}

function getFreeDiskGb(targetPath) {
  if (typeof fs.statfsSync !== 'function') return Number.POSITIVE_INFINITY;
  const s = fs.statfsSync(targetPath);
  return (s.bavail * s.bsize) / (1024 ** 3);
}

async function scanAndEnqueue() {
  const roots = loadScannerRoots();
  if (!Array.isArray(roots) || roots.length === 0) {
    await queue.appendLog('No scanner roots configured');
    return 0;
  }

  await queue.appendLog(`Scanning ${roots.length} roots for media files...`);
  let totalFiles = 0;
  let newFiles = 0;

  for (const root of roots) {
    if (!root.scanPath || !fs.existsSync(root.scanPath)) continue;
    let count = 0;
    const batch = [];
    try {
      for (const file of walkVideoFiles(root.scanPath)) {
        batch.push({ filePath: file.filePath, root, extension: file.extension, size: file.size });
        count++;
        if (batch.length >= 100) {
          const added = await queue.enqueueScannerItems(batch);
          newFiles += added;
          batch.length = 0;
        }
        if (isShuttingDown) break;
      }
    } catch (err) {
      await queue.appendLog(`Root ${root.label || root.scanPath}: error at file ${count} — ${err.message.split('\n')[0]}`);
    }
    if (batch.length > 0) {
      const added = await queue.enqueueScannerItems(batch);
      newFiles += added;
    }
    totalFiles += count;
    await queue.appendLog(`Root ${root.label || root.scanPath}: ${count} files, ${newFiles} new`);
  }

  await queue.appendLog(`Discovery complete: ${totalFiles} total, ${newFiles} newly queued`);
  return newFiles;
}

function determineStrategy(probeData, extension) {
  const profile = collectPlaybackProfile(probeData, extension);
  if (!profile.hasVideo) return { mode: 'transcode', reason: 'no-video', profile };
  if (profile.canDirectPlayMp4 || profile.canDirectPlayWebm) return { mode: 'direct', reason: 'browser-safe', profile };
  if (profile.mp4FriendlyVideo && profile.mp4FriendlyAudio) return { mode: 'remux-copy', reason: 'container-only', profile };
  if (profile.mp4FriendlyVideo) return { mode: 'copy-video-transcode-audio', reason: 'audio-only', profile };
  return { mode: 'transcode', reason: 'full-transcode-needed', profile };
}

async function processScannerQueue() {
  const item = await queue.dequeueScannerItem();
  if (!item) return false;

  await queue.appendLog(`[scanner] probing ${path.basename(item.filePath)}`);

  try {
    const probeData = await probeMedia(item.filePath, { timeoutMs: 30000 });
    const strategy = determineStrategy(probeData, item.extension);

    if (strategy.mode === 'direct') {
      await queue.appendLog(`[scanner] ${path.basename(item.filePath)} is browser-native, enriching metadata...`);
      await queue.completeScannerItem(item.id, { status: 'completed', strategy: 'direct', probeResult: strategy.profile });
      await enrichAndCatalog(item.filePath, item.root, strategy.profile);
    } else {
      await queue.appendLog(`[scanner] ${path.basename(item.filePath)} needs ${strategy.mode}, moving to normalizer queue`);
      await queue.completeScannerItem(item.id, { status: 'probed', strategy: strategy.mode, probeResult: strategy.profile });
      await queue.moveScannerItemToNormalizer(item.id, strategy.mode);
    }
  } catch (err) {
    const msg = err.message.split('\n')[0];
    await queue.appendLog(`[scanner] FAILED ${path.basename(item.filePath)}: ${msg}`);
    await queue.completeScannerItem(item.id, { status: 'failed', error: msg });
  }

  return true;
}

async function enrichAndCatalog(filePath, root, profile) {
  const scanner = require('../src/services/scanner');
  const fileName = path.basename(filePath);
  const baseName = path.basename(fileName, path.extname(fileName));
  const contentType = root.type === 'series' ? 'series' : 'movie';

  const publicUrl = root.publicBaseUrl
    ? `${root.publicBaseUrl}/${path.relative(root.scanPath, filePath).split(path.sep).join('/')}`
    : '';

  const item = {
    title: baseName,
    type: contentType,
    sourceType: 'scanner',
    sourceRootId: root.id,
    sourceRootLabel: root.label,
    videoUrl: publicUrl,
    sourcePath: filePath,
    sourcePublicPath: publicUrl,
    runtime: profile?.duration ? Math.round(Number(profile.duration)) : 0,
    durationSeconds: profile?.duration ? Math.round(Number(profile.duration)) : 0,
    quality: profile?.videoCodec || '',
  };

  try {
    const enriched = await enrichItemWithMetadata(item);
    const itemToUpsert = {
      ...item,
      title: enriched.title || item.title,
      year: enriched.year || null,
      description: enriched.description || '',
      genres: enriched.genres || [],
      language: enriched.language || root.language || 'en',
      poster: enriched.poster || '',
      backdrop: enriched.backdrop || '',
      tmdbId: enriched.tmdbId || null,
      imdbId: enriched.imdbId || null,
      metadataStatus: enriched.metadataStatus || 'pending',
      metadataProvider: enriched.metadataProvider || '',
      metadataConfidence: enriched.metadataConfidence || 0,
    };

    const result = await upsertScannedItem(itemToUpsert);
    const status = result?.status || 'draft';
    await queue.appendLog(`[catalog] ${fileName} → ${status} (${enriched.metadataStatus})`);
    return { catalogItemId: result?.id, metadataStatus: enriched.metadataStatus };
  } catch (err) {
    await queue.appendLog(`[catalog] FAILED ${fileName}: ${err.message.split('\n')[0]}`);
    return { catalogItemId: null, metadataStatus: 'failed' };
  }
}

async function normalizeFile(filePath, outputPath, strategy, onProgress) {
  const ffmpegBin = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
  const args = getFfmpegFileArgs(filePath, outputPath, strategy);

  const ioniceBin = '/usr/bin/ionice';
  const niceBin = '/usr/bin/nice';
  const fullArgs = ['-c', '3', niceBin, '-n', '19', ffmpegBin, ...args];

  return new Promise((resolve, reject) => {
    const proc = spawn(ioniceBin, fullArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', code => {
      if (code !== 0) reject(new Error(stderr.split('\n').slice(-2).join(' ') || `exit code ${code}`));
      else resolve();
    });
  });
}

async function processNormalizerQueue() {
  const item = await queue.dequeueNormalizerItem();
  if (!item) return false;

  const baseName = path.basename(item.filePath, path.extname(item.filePath));
  const dir = path.dirname(item.filePath);
  const outputPath = path.join(dir, `${baseName}.mp4`);
  const tempPath = path.join(dir, `${baseName}.normalizing.mp4`);

  await queue.appendLog(`[normalizer] processing ${path.basename(item.filePath)} (${item.strategy})`);

  try {
    const freeGb = getFreeDiskGb(dir);
    if (freeGb < 5) {
      throw new Error(`Low disk space: ${freeGb.toFixed(2)}GB`);
    }

    const useRemux = item.strategy === 'remux-copy' || item.strategy === 'copy-video-transcode-audio';
    await normalizeFile(item.filePath, tempPath, item.strategy, null);

    const backupPath = path.join(dir, `${baseName}.orig${path.extname(item.filePath)}`);
    fs.renameSync(item.filePath, backupPath);
    fs.renameSync(tempPath, outputPath);

    if (root?.scanPath && root?.publicBaseUrl) {
      refreshCatalogReferencesForNormalizedFile({
        previousSourcePath: item.filePath,
        nextSourcePath: outputPath,
        previousVideoUrl: '',
        nextVideoUrl: '',
      });
    }

    await queue.appendLog(`[normalizer] converted ${path.basename(item.filePath)} → ${baseName}.mp4 (backup: ${path.basename(backupPath)})`);

    await queue.appendLog(`[normalizer] enriching metadata for ${baseName}.mp4...`);
    const root = item.root;
    const result = await enrichAndCatalog(outputPath, root, item.probeResult);
    await queue.completeNormalizerItem(item.id, { status: 'completed', ...result });

  } catch (err) {
    const msg = err.message.split('\n')[0];
    await queue.appendLog(`[normalizer] FAILED ${path.basename(item.filePath)}: ${msg}`);
    if (fs.existsSync(tempPath)) { try { fs.unlinkSync(tempPath); } catch {} }
    await queue.completeNormalizerItem(item.id, { status: 'failed', error: msg });
  }

  return true;
}

async function main() {
  const lock = await queue.getPipelineLock();
  if (lock) {
    try {
      process.kill(lock.pid, 0);
      console.error(`Pipeline already running (pid=${lock.pid})`);
      process.exit(1);
    } catch {
      await queue.appendLog(`Stale lock from pid=${lock.pid}, overriding`);
    }
  }

  await queue.setPipelineLock({ pid: process.pid, startedAt: new Date().toISOString(), hostname: os.hostname() });

  process.on('SIGINT', async () => { isShuttingDown = true; await queue.releasePipelineLock(); process.exit(0); });
  process.on('SIGTERM', async () => { isShuttingDown = true; await queue.releasePipelineLock(); process.exit(0); });

  console.log('Pipeline runner started');
  await queue.appendLog('Pipeline runner started');

  // Phase 1: Discover and queue files
  const discovered = await scanAndEnqueue();
  console.log(`Discovered ${discovered} new files`);

  // Phase 2: Process scanner queue (probe → direct-enrich or pass to normalizer)
  let scannerBusy = true;
  while (scannerBusy && !isShuttingDown) {
    scannerBusy = await processScannerQueue();
    if (!scannerBusy) {
      const status = await queue.getQueueStatus();
      if (status.scanner.pending > 0 || status.scanner.failed > 0) scannerBusy = true;
    }
  }

  console.log('Scanner queue complete, starting normalizer...');
  await queue.appendLog('Scanner queue complete, starting normalizer...');

  // Phase 3: Process normalizer queue
  let normalizerBusy = true;
  while (normalizerBusy && !isShuttingDown) {
    normalizerBusy = await processNormalizerQueue();
    if (!normalizerBusy) {
      const status = await queue.getQueueStatus();
      if (status.normalizer.pending > 0 || status.normalizer.failed > 0) normalizerBusy = true;
    }
    if (!normalizerBusy) await sleep(1000);
  }

  await queue.appendLog('Pipeline complete');
  await queue.releasePipelineLock();
  console.log('Pipeline complete');
}

if (require.main === module) {
  main().catch(async err => {
    console.error('Pipeline error:', err.message);
    await queue.appendLog(`Pipeline error: ${err.message}`);
    await queue.releasePipelineLock();
    process.exit(1);
  });
}

module.exports = { scanAndEnqueue, processScannerQueue, processNormalizerQueue, enrichAndCatalog };
