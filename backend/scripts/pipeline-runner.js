require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');

// Capture all crashes to a temp file for debugging
function dumpError(tag, err) {
  try { fs.writeFileSync('/tmp/pipeline-crash.log', new Date().toISOString() + ' ' + tag + ': ' + (err?.stack || err) + '\n', { flag: 'a' }); } catch(e) {}
}
process.on('uncaughtException', (err) => { dumpError('UNCAUGHT', err); console.error('UNCAUGHT:', err); process.exit(1); });
process.on('unhandledRejection', (r) => { dumpError('UNHANDLED', r); console.error('UNHANDLED:', r); process.exit(1); });

const os = require('os');
const { spawn } = require('child_process');
const { loadScannerRoots, upsertScannedItem, refreshCatalogReferencesForNormalizedFile, db } = require('../src/data/store');
const { probeMedia, collectPlaybackProfile, getFfmpegFileArgs } = require('../src/services/player-media');
const { enrichItemWithMetadata } = require('../src/services/metadata-enricher');
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

async function isScanSignaturePublished(scanSig) {
  if (!scanSig) return false;
  try {
    const result = await db.query("SELECT 1 FROM content_catalog WHERE payload->>'scanSignature' = $1 AND status = 'published' LIMIT 1", [scanSig]);
    return result.rows.length > 0;
  } catch { return false; }
}

function scanSigOf(root, filePath) {
  const relativePath = path.relative(root.scanPath, filePath).split(path.sep).join('/');
  return `${root.id}:${relativePath}`.replace(/\.[^.]+$/, '');
}

async function scanAndEnqueue() {
  const roots = loadScannerRoots();
  console.log(`[pipeline] scanAndEnqueue: found ${Array.isArray(roots) ? roots.length : 'invalid'} roots`);
  if (!Array.isArray(roots) || roots.length === 0) {
    await queue.appendLog('No scanner roots configured');
    console.log('[pipeline] ERROR: No scanner roots found in cache');
    return 0;
  }
  for (const r of roots) {
    console.log(`[pipeline] root: ${r.label || 'unnamed'} path=${r.scanPath || 'N/A'} exists=${r.scanPath ? require('fs').existsSync(r.scanPath) : false}`);
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
      const sig = item.root ? scanSigOf(item.root, item.filePath) : null;
      const alreadyPublished = await isScanSignaturePublished(sig);
      if (alreadyPublished) {
        await queue.appendLog(`[scanner] ${path.basename(item.filePath)} already published, skipping enrichment`);
        await queue.completeScannerItem(item.id, { status: 'completed', strategy: 'direct', probeResult: strategy.profile });
      } else {
        await queue.appendLog(`[scanner] ${path.basename(item.filePath)} is browser-native, enriching metadata...`);
        await queue.completeScannerItem(item.id, { status: 'completed', strategy: 'direct', probeResult: strategy.profile });
        await enrichAndCatalog(item.filePath, item.root, strategy.profile);
      }
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

  const relativePath = path.relative(root.scanPath, filePath).split(path.sep).join('/');
  const publicUrl = root.publicBaseUrl ? `${root.publicBaseUrl}/${relativePath}` : '';
  const scanSignature = scanSigOf(root, filePath);

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
    scanSignature,
  };

  // Ensure scanSignature matches for items from old scanner (which had extension in sig)
  try {
    const existingByPath = await db.query("SELECT id, payload FROM content_catalog WHERE payload->>'sourcePath' = $1 LIMIT 1", [filePath]);
    if (existingByPath.rows.length > 0 && existingByPath.rows[0].payload.scanSignature !== scanSignature) {
      await db.query("UPDATE content_catalog SET payload = jsonb_set(payload, '{scanSignature}', $2::jsonb) WHERE id = $1",
        [existingByPath.rows[0].id, JSON.stringify(scanSignature)]);
    }
  } catch {}

  try {
    // Skip metadata enrichment if already published with good metadata
    let skipEnrich = false;
    try {
      const existingMeta = await db.query("SELECT payload->>'metadataStatus' AS ms, status FROM content_catalog WHERE payload->>'scanSignature' = $1 LIMIT 1", [scanSignature]);
      if (existingMeta.rows.length > 0 && existingMeta.rows[0].status === 'published' && existingMeta.rows[0].ms === 'matched') skipEnrich = true;
    } catch {}

    let enriched;
    if (skipEnrich) {
      enriched = {
        metadataStatus: 'matched', metadataConfidence: 90, metadataProvider: 'cached',
        title: null, year: null, description: null, genres: null, language: null, poster: null, backdrop: null, tmdbId: null, imdbId: null,
      };
    } else {
      enriched = await enrichItemWithMetadata(item);
    }
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

    const root = item.root;
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

const RUN_MODE = process.argv.slice(2).includes('--normalizer') ? 'normalizer' : process.argv.slice(2).includes('--scanner') ? 'scanner' : 'full';

function lockApi() {
  if (RUN_MODE === 'scanner') return { get: queue.getScannerLock, set: queue.setScannerLock, release: queue.releaseScannerLock };
  if (RUN_MODE === 'normalizer') return { get: queue.getNormalizerLock, set: queue.setNormalizerLock, release: queue.releaseNormalizerLock };
  return { get: queue.getPipelineLock, set: queue.setPipelineLock, release: queue.releasePipelineLock };
}

const lock = lockApi();

async function runScannerPhase() {
  const discovered = await scanAndEnqueue();
  console.log(`Discovered ${discovered} new files`);

  let scannerBusy = true;
  while (scannerBusy && !isShuttingDown) {
    scannerBusy = await processScannerQueue();
    if (!scannerBusy) {
      const status = await queue.getQueueStatus();
      if (status.scanner.pending > 0 || status.scanner.failed > 0) scannerBusy = true;
    }
  }
}

async function runNormalizerPhase() {
  let normalizerBusy = true;
  while (normalizerBusy && !isShuttingDown) {
    normalizerBusy = await processNormalizerQueue();
    if (!normalizerBusy) {
      const status = await queue.getQueueStatus();
      if (status.normalizer.pending > 0 || status.normalizer.failed > 0) normalizerBusy = true;
    }
    if (!normalizerBusy) await sleep(1000);
  }
}

async function main() {
  console.log(`[pipeline] Starting ${RUN_MODE} worker, pid=${process.pid}, cwd=${process.cwd()}`);
  console.log(`[pipeline] DB_HOST=${process.env.DB_HOST || 'NOT SET'}, DB_NAME=${process.env.DB_NAME || 'NOT SET'}`);
  const existingLock = await lock.get();
  if (existingLock) {
    let isStale = true;
    try {
      process.kill(existingLock.pid, 0);
      // PID exists — verify it's actually a pipeline-runner process (not recycled PID)
      try {
        const cmdline = require('fs').readFileSync('/proc/' + existingLock.pid + '/cmdline', 'utf8');
        if (cmdline.includes('pipeline-runner.js')) {
          isStale = false;
        } else {
          console.log(`[pipeline] PID ${existingLock.pid} is not a pipeline worker (recycled), overriding stale lock`);
        }
      } catch {
        // Can't read /proc — fall back to timestamp check
        const ageMs = Date.now() - new Date(existingLock.startedAt).getTime();
        if (ageMs < 120000) isStale = false; // less than 2 min old = probably real
      }
    } catch {
      isStale = true;
    }
    if (!isStale) {
      console.error(`Pipeline ${RUN_MODE} already running (pid=${existingLock.pid})`);
      process.exit(1);
    }
    await queue.appendLog(`[${RUN_MODE}] Stale lock from pid=${existingLock.pid}, overriding`);
  }

  // Reset stuck 'processing' items from previous crashed workers
  if (RUN_MODE === 'scanner' || RUN_MODE === 'full') {
    const q = await queue.getQueue();
    let resetCount = 0;
    for (const item of q.scannerQueue) {
      if (item.status === 'processing') { item.status = 'pending'; item.error = 'reset from stale lock'; resetCount++; }
    }
    if (resetCount > 0) { await queue.saveQueue(q); await queue.appendLog(`[${RUN_MODE}] Reset ${resetCount} stuck scanner items`); }
  }
  if (RUN_MODE === 'normalizer' || RUN_MODE === 'full') {
    const q = await queue.getQueue();
    let resetCount = 0;
    for (const item of q.normalizerQueue) {
      if (item.status === 'processing') { item.status = 'pending'; item.error = 'reset from stale lock'; resetCount++; }
    }
    if (resetCount > 0) { await queue.saveQueue(q); await queue.appendLog(`[${RUN_MODE}] Reset ${resetCount} stuck normalizer items`); }
  }

  await lock.set({ pid: process.pid, startedAt: new Date().toISOString(), hostname: os.hostname(), mode: RUN_MODE });

  const shutdown = async () => { isShuttingDown = true; await lock.release(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`Pipeline ${RUN_MODE} started`);
  await queue.appendLog(`[${RUN_MODE}] Worker started`);

  if (RUN_MODE === 'full' || RUN_MODE === 'scanner') {
    await runScannerPhase();
  }

  if (RUN_MODE === 'full') {
    console.log('Scanner queue complete, starting normalizer...');
    await queue.appendLog('[pipeline] Scanner queue complete, starting normalizer...');
  }

  if (RUN_MODE === 'full' || RUN_MODE === 'normalizer') {
    await runNormalizerPhase();
  }

  await queue.appendLog(`[${RUN_MODE}] Complete`);
  await lock.release();
  console.log(`Pipeline ${RUN_MODE} complete`);
}

if (require.main === module) {
  main().catch(async err => {
    dumpError('MAIN_ERR', err);
    console.error('Pipeline error:', err.message);
    try {
      await queue.appendLog(`[${RUN_MODE}] Error: ${err.message}`);
      await lock.release();
    } catch(e) {}
    process.exit(1);
  });
}

module.exports = { scanAndEnqueue, processScannerQueue, processNormalizerQueue, enrichAndCatalog };
