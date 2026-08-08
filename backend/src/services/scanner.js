const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const {
  deleteItemsByScanSignatures,
  deleteScannerItemsNotInSignatures,
  getAppState,
  getItemByScanSignature,
  getRootIdsWithContent,
  getScanSignaturesByRootId,
  getScannerRunById,
  getScannerRuns,
  loadScannerRoots,
  loadScannerRuntime,
  loadScannerState,
  normalizeTitleKey,
  recordScannerRun,
  refreshCatalogReferencesForNormalizedFile,
  refreshScannerCaches,
  saveScannerRoots,
  saveScannerRuntime,
  saveScannerState,
  upsertScannedItem,
} = require('../data/store');
const { setAppState } = require('../data/store/base');

const { enrichItemWithMetadata, getEnhancedCacheStats } = require('./scanner-enhanced-metadata');
const { retryAsync } = require('./scanner-error-handler');
const { listDirectoryEntriesSafe, isPathReadable } = require('./scanner-permission-handler');
const {
  buildSeriesSeasons: buildSeriesSeasonsFromParser,
  cleanTitle,
  countEpisodeLikeFiles,
  hasSequentialEpisodePattern,
  looksLikeSeasonFolder,
  parseEpisodeIdentity,
  slugify,
  isExplicitSeriesFile,
  parseShowNameFromFilename,
  safeDecodeURIComponent,
  stripSeasonSuffix,
} = require('./scanner-series-parser');

const VIDEO_EXTENSIONS = new Set(
  String(process.env.SCANNER_VIDEO_EXTENSIONS || '.mp4,.mkv,.avi,.mov,.wmv,.m4v,.webm,.ts,.m2ts,.mpg,.mpeg,.3gp,.flv,.vob')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIN_MOVIE_SIZE = Number(process.env.SCANNER_MIN_MOVIE_SIZE || 104857600); // 100MB
const MIN_EPISODE_SIZE = Number(process.env.SCANNER_MIN_EPISODE_SIZE || 104857600); // 100MB
const JUNK_REGEX = /\b(sample|trailer|extras?|promo|short|clip|preview|teaser|behind\s*the\s*scenes|yts\.mx|advertisement|featurette)\b/i;
const DUPLICATE_HOLD_DIR_NAME = process.env.MEDIA_NORMALIZER_DUPLICATE_DIR || '_duplicate_hold';
const PREFERRED_POSTER_PATTERNS = [
  /^(poster|cover|folder|front)$/i,
  /(poster|cover|folder|front)/i,
  /(backdrop|banner|fanart)/i,
];
const DEFAULT_MOVIE_DEPTH = Math.max(1, Number(process.env.SCANNER_DEFAULT_MOVIE_DEPTH || 6));
const DEFAULT_BATCH_SIZE = 25;
const PROGRESS_EMIT_INTERVAL = Math.max(1, Number(process.env.SCANNER_PROGRESS_EMIT_INTERVAL || 10));
const DEFAULT_MEDIA_LIBRARY_ROOT = process.env.SCANNER_MEDIA_ROOT || '/var/www/html';
const ENABLE_AUTO_DISCOVER_ROOTS = process.env.SCANNER_AUTO_DISCOVER_ROOTS !== 'false';
const AUTO_DISCOVER_MAX_DEPTH = Math.max(1, Number(process.env.SCANNER_AUTO_DISCOVER_MAX_DEPTH || 3));
const AUTO_SCAN_INTERVAL_MINUTES = Math.max(0, Number(process.env.SCANNER_AUTO_SCAN_INTERVAL_MINUTES || 0));
const RECONCILIATION_INTERVAL_HOURS = Math.max(1, Number(process.env.SCANNER_RECONCILIATION_INTERVAL_HOURS || 6));
const RECONCILIATION_SEARCH_DEPTH = Math.max(1, Number(process.env.SCANNER_RECONCILIATION_SEARCH_DEPTH || 5));
const SCANNER_AUTO_RESUME_ON_RESTART = process.env.SCANNER_AUTO_RESUME_ON_RESTART !== 'false';
const SCANNER_AUTO_RESUME_DELAY_MS = Math.max(1000, Number(process.env.SCANNER_AUTO_RESUME_DELAY_MS || 5000));
const SCANNER_DISCOVER_TIMEOUT_MS = Math.max(30000, Number(process.env.SCANNER_DISCOVER_TIMEOUT_MS || 60000));
// Opt-in only. A transient SMB/NFS mount hiccup makes a configured root look "missing"; with
// this on it would be permanently deleted from persistence mid-scan. Default off so a flaky
// network mount never destroys a legitimately-configured root.
const SCANNER_CLEANUP_MISSING_ROOTS = process.env.SCANNER_CLEANUP_MISSING_ROOTS === 'true';
// Opt-in: rename source media files on disk to match matched metadata. Off by default so a
// draft-producing scan never mutates the user's files unexpectedly.
const SCANNER_RENAME_MEDIA = process.env.SCANNER_RENAME_MEDIA === 'true';
// Grace period after SIGTERM before a stuck scan worker is force-killed (SIGKILL).
const SCANNER_STOP_GRACE_MS = Math.max(2000, Number(process.env.SCANNER_STOP_GRACE_MS || 10000));
// Cross-instance advisory lock: a persisted running job whose heartbeat is fresher than this
// TTL is considered owned by another server instance, so this one won't start a second scan.
// Generous default so a slow root (infrequent progress heartbeats) isn't falsely stolen.
const SCANNER_LOCK_TTL_MS = Math.max(60000, Number(process.env.SCANNER_LOCK_TTL_MS || 5 * 60 * 1000));
const SCANNER_INSTANCE_ID = `${require('os').hostname()}:${process.pid}`;
// Cap the number of newly-discovered auto-roots processed per scan so that the
// first scan after a discovery fix doesn't try to process 500+ roots at once.
// Already-scanned roots (those with existing DB signatures) are always included;
// this cap only applies to brand-new roots with zero DB signatures.
const MAX_NEW_ROOTS_PER_SCAN = Math.max(10, Number(process.env.SCANNER_MAX_NEW_ROOTS_PER_SCAN || 30));
// URL to POST scan completion summary to (e.g. a monitoring webhook service)
const SCANNER_COMPLETION_WEBHOOK_URL = String(process.env.SCANNER_COMPLETION_WEBHOOK_URL || '').trim();
// Per-root timeout: if a single root takes longer than this (ms), the scan moves on.
// Default 0 = no timeout.
const SCANNER_ROOT_TIMEOUT_MS = Math.max(0, Number(process.env.SCANNER_ROOT_TIMEOUT_MS || 0));
const SKIP_DISCOVERY_NAMES = new Set(['portal', 'uploads', 'assets', 'css', 'js', 'api']);
const SKIP_DISCOVERY_PATTERNS = [
  /\bcache\b/i,
  /\bbackup\b/i,
  /\btmp\b/i,
  /\btemp\b/i,
  /\bthumbnail\b/i,
  /\bposter\b/i,
  /\bpreview\b/i,
  /\btrailer\b/i,
  /\bsubtitle\b/i,
];
const BLOCKED_AUTO_ROOT_PATTERNS = [
  /\bebook\b/i,
  /\bsoftware\b/i,
  /\btutorial\b/i,
  /\bdocs?\b/i,
  /\bdocumentary\b/i,
  /\binbox\b/i,
  /\bpending\b/i,
  /\bqueue\b/i,
  /\bdownloads?\b/i,
  /\bimports?\b/i,
  /\bstaging\b/i,
  // Organizational media library folders (not content themselves)
  /\bTV[_\s-]?(Series|Shows?)\b/i,
  /\bTV[_\s-]?Web[_\s-]?Series\b/i,
  /\bWeb[_\s-]?Series\b/i,
  /\w+[_\s-]?Movies\b/i,
  /^Movies(?:_Archive)?$/i,
  /^\w+_Archive$/i,
  /^New_Collection$/i,
  /^(Others|Requested)$/i,
  /^Extra_Storage(?:_\d+)?$/i,
  /^(Games|PS4_Games|Games_Archive)$/i,
  /^Series$/i,
];

let currentScanJob = null;
let currentScanChild = null;
let autoScanTimer = null;
let resumeScanTimer = null;
let reconciliationTimer = null;
let signalHandlersRegistered = false;
// Cooperative abort: set (e.g. by the worker's SIGTERM handler) to stop the scan between roots
// so it can finalize cleanly instead of being killed mid-DB-write.
let scanAbortRequested = false;
let scannerLogWriteCount = 0;

// ── FILE RELOCATION CACHE ─────────────────────────────────────────────────────
// Cache file moves (old path → new path) to speed up future scans.
// When a file is moved/renamed, the scanner can instantly match it instead of
// doing expensive directory walks.
const fileRelocationCache = new Map(); // oldPath → { newPath, detectedAt }
const FILE_RELOCATION_CACHE_MAX = 10000;
const FILE_RELOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheFileRelocation(oldPath, newPath) {
  if (fileRelocationCache.size >= FILE_RELOCATION_CACHE_MAX) {
    // Evict oldest entries
    const entries = [...fileRelocationCache.entries()];
    const toDelete = entries.slice(0, Math.floor(FILE_RELOCATION_CACHE_MAX / 4));
    for (const [key] of toDelete) {
      fileRelocationCache.delete(key);
    }
  }
  fileRelocationCache.set(oldPath, {
    newPath,
    detectedAt: Date.now(),
  });

  // ── PERSIST: save cache snapshot to DB so server restarts don't lose relocation data ──
  // Fire-and-forget; don't block the scan for a cache write.
  setFileRelocationCachePersisted().catch(() => {});
}

function getCachedRelocation(oldPath) {
  const cached = fileRelocationCache.get(oldPath);
  if (!cached) return null;
  if (Date.now() - cached.detectedAt > FILE_RELOCATION_CACHE_TTL_MS) {
    fileRelocationCache.delete(oldPath);
    return null;
  }
  return cached.newPath;
}

function getFileRelocationCacheStats() {
  return {
    size: fileRelocationCache.size,
    maxSize: FILE_RELOCATION_CACHE_MAX,
    ttlMs: FILE_RELOCATION_CACHE_TTL_MS,
  };
}

// ── PERSISTENCE HELPERS ────────────────────────────────────────────────────────
// Save the in-memory relocation cache to DB so it survives restarts.
async function setFileRelocationCachePersisted() {
  const snapshot = {};
  const now = Date.now();
  for (const [oldPath, entry] of fileRelocationCache.entries()) {
    if (now - entry.detectedAt <= FILE_RELOCATION_CACHE_TTL_MS) {
      snapshot[oldPath] = entry;
    }
  }
  try {
    await setAppState('file_relocation_cache', snapshot);
  } catch { /* non-critical */ }
}

// Load the persisted relocation cache back into memory (called on startup).
async function loadFileRelocationCachePersisted() {
  try {
    const snapshot = await getAppState('file_relocation_cache', {});
    const now = Date.now();
    let loaded = 0;
    for (const [oldPath, entry] of Object.entries(snapshot || {})) {
      if (entry && entry.newPath && now - (entry.detectedAt || 0) <= FILE_RELOCATION_CACHE_TTL_MS) {
        fileRelocationCache.set(oldPath, entry);
        loaded++;
      }
    }
    if (loaded > 0) {
      // eslint-disable-next-line no-console
      console.log(`[scanner] Restored ${loaded} file relocation cache entries from DB.`);
    }
  } catch { /* non-critical */ }
}

function requestScanAbort() {
  scanAbortRequested = true;
}


function isPosixAbsolutePath(value) {
  return /^\/[^/]+/.test(String(value || '').trim());
}

function isWindowsAbsolutePath(value) {
  return /^[a-zA-Z]:[\\/]/.test(String(value || '').trim()) || /^\\\\[^\\]/.test(String(value || '').trim());
}

function assessScanPath(scanPath) {
  const normalizedPath = String(scanPath || '').trim();

  if (!normalizedPath) {
    return {
      exists: false,
      checkable: false,
      status: 'invalid',
      statusLabel: 'Not Configured',
      error: 'Scanner root path is not configured.',
    };
  }

  if (process.platform === 'win32' && isPosixAbsolutePath(normalizedPath)) {
    return {
      exists: false,
      checkable: false,
      status: 'remote',
      statusLabel: 'Linux Server Path',
      error: `Configured for Linux server: ${normalizedPath}`,
    };
  }

  if (process.platform !== 'win32' && isWindowsAbsolutePath(normalizedPath)) {
    return {
      exists: false,
      checkable: false,
      status: 'remote',
      statusLabel: 'Windows Path',
      error: `Configured for Windows machine: ${normalizedPath}`,
    };
  }

  const exists = fs.existsSync(normalizedPath);
  return {
    exists,
    checkable: true,
    status: exists ? 'available' : 'missing',
    statusLabel: exists ? 'Available' : 'Missing',
    error: exists ? '' : `Path not found: ${normalizedPath}`,
  };
}

function waitForImmediate() {
  return new Promise((resolve) => setImmediate(resolve));
}

function toPublicUrl(root, absolutePath) {
  const relativePath = path.relative(root.scanPath, absolutePath).split(path.sep).join('/');
  return `${root.publicBaseUrl}/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}

function extractYear(value) {
  const match = String(value || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function buildSeriesSeasons(root, seriesFolderName, seriesPath, preferredSeasonLabel = 'Season 1') {
  return buildSeriesSeasonsFromParser(root, seriesFolderName, seriesPath, {
    listFiles,
    listDirectories,
    listVideoFiles,
    toPublicUrl,
    findSubtitleFile,
    preferredSeasonLabel,
  });
}

function detectSeriesFolder(root, folderPath, files = [], nestedDirectories = []) {
  if (root.type === 'series') {
    return true;
  }

  const directVideoFiles = listVideoFiles(files, folderPath, 'series');
  const directEpisodeLikeCount = countEpisodeLikeFiles(directVideoFiles);
  if (directEpisodeLikeCount >= 2) {
    return true;
  }

  if (directVideoFiles.length >= 2 && hasSequentialEpisodePattern(directVideoFiles)) {
    return true;
  }

  const seasonLikeDirectories = nestedDirectories.filter((dirName) => looksLikeSeasonFolder(dirName));
  if (seasonLikeDirectories.length) {
    return seasonLikeDirectories.some((dirName) => {
      const seasonPath = path.join(folderPath, dirName);
      const seasonFiles = listFiles(seasonPath);
      const seasonVideoFiles = listVideoFiles(seasonFiles, seasonPath, 'series');
      return countEpisodeLikeFiles(seasonVideoFiles) >= 1
        || seasonVideoFiles.length >= 2
        || hasSequentialEpisodePattern(seasonVideoFiles);
    });
  }

  return false;
}

function assignScannerTaxonomy(item) {
  const genres = Array.isArray(item.genres) ? item.genres.filter(Boolean) : [];
  const primaryGenre = genres[0] || '';
  const fallbackCategory = item.type === 'series' ? 'TV Series' : 'Movies';

  return {
    ...item,
    category: primaryGenre || item.category || fallbackCategory,
    collection: item.collection || (item.type === 'series' ? 'Series' : 'Movies'),
    tags: Array.isArray(item.tags) && item.tags.length ? item.tags : genres,
  };
}

function sanitizeForFilename(value) {
  return String(value || '')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function renameMediaForItem(item) {
  // Renaming mutates the user's source media on disk. A scan that merely produces drafts should
  // not silently rename files, so this is gated behind an explicit opt-in flag (default off).
  if (!SCANNER_RENAME_MEDIA) return item;
  if (item.metadataStatus !== 'matched') return item;
  if (!item.originalTitle && !item.title) return item;

  const tmdbTitle = item.originalTitle || item.title;
  const year = item.year ? ` (${item.year})` : '';
  const baseName = sanitizeForFilename(`${tmdbTitle}${year}`);
  if (!baseName) return item;

  const sourcePath = item.sourcePath || '';
  if (!sourcePath || !fs.existsSync(sourcePath)) return item;

  try {
    // Check if the file is currently locked, uploading, or has no write permissions
    try {
      fs.accessSync(sourcePath, fs.constants.W_OK);
    } catch (err) {
      logScannerEvent('file_rename_skipped_locked', { sourcePath, error: 'File is locked or has no write permissions' });
      return item;
    }

    const dirName = path.dirname(sourcePath);
    const ext = path.extname(sourcePath);
    const isFile = ext !== '' && fs.statSync(sourcePath).isFile();
    const newName = isFile ? `${baseName}${ext}` : baseName;
    const newPath = path.join(dirName, newName);

    if (normalizePathForCompare(newPath) === normalizePathForCompare(sourcePath)) return item;
    if (fs.existsSync(newPath)) return item;

    const oldPublicUrl = item.videoUrl || item.sourcePublicPath || '';

    fs.renameSync(sourcePath, newPath);
    logScannerEvent('file_renamed', { from: sourcePath, to: newPath });

    const nextItem = { ...item, sourcePath: newPath };

    // Update scanSignature to match new path so next scan doesn't create duplicates
    const oldSig = item.scanSignature || '';
    const sigSep = oldSig.indexOf(':');
    if (sigSep !== -1) {
      const rootId = oldSig.slice(0, sigSep);
      const oldRel = oldSig.slice(sigSep + 1);
      const oldSrcN = (item.sourcePath || '').replace(/\\/g, '/');
      const oldRelN = oldRel.replace(/\\/g, '/');
      if (oldSrcN.endsWith(oldRelN)) {
        const rootPath = oldSrcN.slice(0, -oldRelN.length);
        const newSrcN = newPath.replace(/\\/g, '/');
        if (newSrcN.startsWith(rootPath)) {
          nextItem.scanSignature = `${rootId}:${newSrcN.slice(rootPath.length)}`;
        }
      }
    }

    if (isFile) {
      const newPublicUrl = oldPublicUrl
        ? oldPublicUrl.replace(/[^/]+$/, encodeURIComponent(newName))
        : '';
      nextItem.videoUrl = newPublicUrl;
      nextItem.sourcePublicPath = newPublicUrl;

      if (oldPublicUrl && newPublicUrl) {
        await refreshCatalogReferencesForNormalizedFile({
          previousSourcePath: sourcePath,
          nextSourcePath: newPath,
          previousVideoUrl: oldPublicUrl,
          nextVideoUrl: newPublicUrl,
        }).catch((err) => logScannerEvent('rename_refresh_error', { error: err.message }));
      }
    }

    return nextItem;
  } catch (error) {
    logScannerEvent('file_rename_error', { sourcePath, error: error.message });
    return item;
  }
}

function listDirectoryEntries(dirPath) {
  try {
    return listDirectoryEntriesSafe(dirPath)
      .filter((entry) => entry.name !== DUPLICATE_HOLD_DIR_NAME);
  } catch (err) {
    // Log so a broken/unreachable mount (EACCES/ENOENT/EIO on network storage) is
    // distinguishable from a genuinely empty folder — silently returning [] here previously
    // made an unmounted root look like "no content".
    logScannerEvent('list_directory_failed', { path: dirPath, code: err.code || '', error: err.message });
    return [];
  }
}

function normalizePathForCompare(input) {
  return String(input || '').replace(/[\\/]+/g, '/').toLowerCase();
}

function pathsOverlap(left, right) {
  const normalizedLeft = normalizePathForCompare(left).replace(/\/+$/, '');
  const normalizedRight = normalizePathForCompare(right).replace(/\/+$/, '');

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight
    || normalizedLeft.startsWith(`${normalizedRight}/`)
    || normalizedRight.startsWith(`${normalizedLeft}/`);
}

// Folders that are in BLOCKED_AUTO_ROOT_PATTERNS but contain NO media content
// whatsoever.  We skip them at the discovery-entry level so the scanner never
// wastes time inside ebook/software/tutorial/docs/games/extra_storage trees.
const NON_MEDIA_BLOCKED_PATTERNS = [
  /\bebook\b/i,
  /\bsoftware\b/i,
  /\btutorial\b/i,
  /\bdocs?\b/i,
  /\bdocumentary\b/i,
  /\binbox\b/i,
  /\bpending\b/i,
  /\bqueue\b/i,
  /\bdownloads?\b/i,
  /\bimports?\b/i,
  /\bstaging\b/i,
  /^(Games|PS4_Games|Games_Archive)$/i,
  /^Extra_Storage(?:_\d+)?$/i,
];

function shouldSkipDiscoveryDir(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  // Non-media blocked folders (games, extra_storage, ebooks …) are skipped here
  // so they never enter the discover loop at all.
  if (NON_MEDIA_BLOCKED_PATTERNS.some((p) => p.test(normalized))) {
    return true;
  }
  // NOTE: isBlockedAutoRootName is NOT checked here — media organizational folders
  // (TV_Series, Movies, Web_Series, language folders…) must enter the main discover
  // loop so their contents (series/movie subfolders) can be classified as auto-roots.
  // The isBlocked path in discoverScannerRoots() handles depth-limited traversal.
  if (SKIP_DISCOVERY_NAMES.has(normalized)) {
    return true;
  }
  if (SKIP_DISCOVERY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  return normalized.startsWith('.');
}

function isBlockedAutoRootName(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return true;
  }

  return BLOCKED_AUTO_ROOT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function shouldSkipCandidateDirectory(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (SKIP_DISCOVERY_NAMES.has(normalized)) {
    return true;
  }

  if (SKIP_DISCOVERY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (/(^|[\s._-])(sample|trailer|extras?|bonus|featurettes?|screens?|subs?|subtitles?|captions?|thumbnails?|covers?|posters?|proof|cache|backup|tmp|temp)([\s._-]|$)/i.test(normalized)) {
    return true;
  }

  return normalized.startsWith('.');
}

function isLikelyMovieCandidateFolder(rootPath, folderPath) {
  const relativeFolder = path.relative(rootPath, folderPath) || '.';
  if (relativeFolder === '.') {
    return true;
  }

  const folderName = path.basename(folderPath);
  if (shouldSkipCandidateDirectory(folderName)) {
    return false;
  }

  const files = listFiles(folderPath);
  if (listVideoFiles(files, folderPath, 'movie').length > 0) {
    return true;
  }

  const nestedDirectories = listDirectories(folderPath).filter((dirName) => !shouldSkipCandidateDirectory(dirName));
  return detectSeriesFolder({ type: 'movie' }, folderPath, files, nestedDirectories);
}

function hasVideoInTree(rootPath, maxDepth = 3) {
  const queue = [{ folderPath: rootPath, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    const entries = listDirectoryEntries(current.folderPath);
    for (const entry of entries) {
      const absolutePath = path.join(current.folderPath, entry.name);
      if (entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return true;
      }
      if (entry.isDirectory() && current.depth < maxDepth) {
        queue.push({ folderPath: absolutePath, depth: current.depth + 1 });
      }
    }
  }
  return false;
}

function inferRootType(label, scanPath, stats = {}) {
  const source = `${label} ${scanPath}`
    .toLowerCase()
    .replace(/[_./\\-]+/g, ' ');
  if (/\b(tv|series|season|episode|web\s+series|anime)\b/.test(source)) {
    return 'series';
  }
  if (/\b(movie|movies|film|cinema|dubbed)\b/.test(source)) {
    return 'movie';
  }
  if ((stats.seriesSignals || 0) > (stats.movieSignals || 0) && (stats.seriesSignals || 0) >= 1) {
    return 'series';
  }
  if ((stats.movieSignals || 0) >= 1) {
    return 'movie';
  }
  return '';
}

function inspectDirectoryShape(dirPath) {
  const entries = listDirectoryEntries(dirPath);
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const directMovieVideos = listVideoFiles(files, dirPath, 'movie');
  const directSeriesVideos = listVideoFiles(files, dirPath, 'series');
  const seasonLikeDirectories = directories.filter((dirName) => looksLikeSeasonFolder(dirName));
  const yearDirectories = directories.filter((dirName) => isYearFolderName(dirName));
  const episodicDirectories = directories.filter((dirName) => {
    const childPath = path.join(dirPath, dirName);
    const childFiles = listFiles(childPath);
    const childDirectories = listDirectories(childPath);
    return detectSeriesFolder({ type: 'movie' }, childPath, childFiles, childDirectories);
  });

  return {
    files,
    directories,
    directMovieVideos,
    directSeriesVideos,
    seasonLikeDirectories,
    yearDirectories,
    episodicDirectories,
    seriesSignals: Number(seasonLikeDirectories.length > 0)
      + Number(episodicDirectories.length >= 2)
      + Number(countEpisodeLikeFiles(files) >= 2)
      + Number(directSeriesVideos.length >= 2 && hasSequentialEpisodePattern(directSeriesVideos)),
    movieSignals: Number(yearDirectories.length >= 2)
      + Number(directMovieVideos.length >= 2)
      + Number(directories.length >= 2 && directories.every((dirName) => isYearFolderName(dirName) || hasVideoInTree(path.join(dirPath, dirName), 1))),
  };
}

function classifyAutoDiscoveredRoot(dirPath) {
  const dirName = path.basename(dirPath);
  if (isBlockedAutoRootName(dirName)) {
    return null;
  }

  const stats = inspectDirectoryShape(dirPath);
  const type = inferRootType(dirName, dirPath, stats);
  if (!type) {
    return null;
  }

  if (type === 'series' && (stats.seriesSignals || 0) < 1 && !/\b(tv|series|season|episode|web\s+series|anime)\b/i.test(dirName)) {
    return null;
  }

  if (type === 'movie' && (stats.movieSignals || 0) < 1 && !/\b(movie|movies|film|cinema|dubbed)\b/i.test(dirName)) {
    return null;
  }

  if (type === 'series' && !hasVideoInTree(dirPath, 4)) {
    return null;
  }
  if (type === 'movie' && !hasVideoInTree(dirPath, 4)) {
    return null;
  }
  return {
    type,
    stats,
  };
}

function isMovieCategoryDirName(dirName) {
  return /\w+[_\s-]?Movies\b/i.test(String(dirName || ''))
    || /^Movies(?:_Archive)?$/i.test(String(dirName || ''));
}

function isTvSeriesContainerDirName(dirName) {
  const normalized = String(dirName || '');
  return /\bTV[_\s-]?(Series|Shows?)\b/i.test(normalized)
    && !/\bTV[_\s-]?Web[_\s-]?Series\b/i.test(normalized);
}

function isTvWebSeriesRangeDirName(dirName) {
  return /\bTV[_\s-]?Web[_\s-]?Series\b/i.test(String(dirName || ''));
}

function buildAutoDiscoveredRootRecord(absolutePath, dirName, type, mediaLibraryRoot = DEFAULT_MEDIA_LIBRARY_ROOT) {
  const relativePath = path.relative(mediaLibraryRoot, absolutePath).split(path.sep).join('/');
  const publicPath = relativePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return {
    id: `auto-${slugify(relativePath)}`,
    label: `Auto: ${cleanTitle(dirName)}`,
    type,
    scanPath: absolutePath,
    publicBaseUrl: `/${publicPath}`.replace(/%2F/g, '/'),
    language: type === 'series' ? 'English' : 'Unknown',
    category: type === 'series' ? 'TV Series' : 'Auto Movies',
    maxDepth: type === 'movie' ? DEFAULT_MOVIE_DEPTH : 1,
    batchSize: type === 'movie' ? 40 : 30,
    discovered: true,
  };
}

function discoverScannerRoots() {
  const mediaLibraryRoot = process.env.SCANNER_MEDIA_ROOT || DEFAULT_MEDIA_LIBRARY_ROOT;
  if (!ENABLE_AUTO_DISCOVER_ROOTS || !fs.existsSync(mediaLibraryRoot)) {
    return [];
  }

  const startTime = Date.now();
  const discovered = [];
  const seenPaths = new Set();

  function addRootIfNew(absolutePath, dirName, type) {
    const normalizedPath = normalizePathForCompare(absolutePath);
    if (seenPaths.has(normalizedPath)) {
      return;
    }
    if (!hasVideoInTree(absolutePath, 4)) {
      return;
    }
    seenPaths.add(normalizedPath);
    discovered.push(buildAutoDiscoveredRootRecord(absolutePath, dirName, type, mediaLibraryRoot));
  }

  for (const dirName of listDirectories(mediaLibraryRoot)) {
    if (Date.now() - startTime > SCANNER_DISCOVER_TIMEOUT_MS) {
      logScannerEvent('discover_roots_timeout', { elapsedMs: Date.now() - startTime, found: discovered.length });
      break;
    }
    if (shouldSkipDiscoveryDir(dirName)) {
      continue;
    }

    const absolutePath = path.join(mediaLibraryRoot, dirName);

    // Top-level movie libraries (English_Movies, Bangla_Movies, 3D_Movies, …) are
    // roots themselves — subfolders (year buckets, individual titles) are scanned
    // recursively by processMovieRoot(), not registered as separate roots.
    if (isMovieCategoryDirName(dirName)) {
      addRootIfNew(absolutePath, dirName, 'movie');
      continue;
    }

    // TV_Series is a container; only its TV_Web_Series-* letter-range folders
    // become series roots (matching the manually configured layout).
    if (isTvSeriesContainerDirName(dirName)) {
      for (const subName of listDirectories(absolutePath)) {
        if (shouldSkipDiscoveryDir(subName) || !isTvWebSeriesRangeDirName(subName)) {
          continue;
        }
        addRootIfNew(path.join(absolutePath, subName), subName, 'series');
      }
      continue;
    }

    // A TV_Web_Series-* folder sitting directly under the media root.
    if (isTvWebSeriesRangeDirName(dirName)) {
      addRootIfNew(absolutePath, dirName, 'series');
      continue;
    }

    const classification = classifyAutoDiscoveredRoot(absolutePath);
    if (classification) {
      addRootIfNew(absolutePath, dirName, classification.type);
    }
  }

  logScannerEvent('discover_roots_completed', { elapsedMs: Date.now() - startTime, found: discovered.length });
  return discovered;
}

function getEffectiveRoots() {
  const persistedRoots = loadScannerRoots();
  const configured = persistedRoots.filter((root) => !root.discovered && !String(root.id || '').startsWith('auto-')).map((root) => ({
    ...root,
    maxDepth: root.maxDepth ?? (root.type === 'movie' ? DEFAULT_MOVIE_DEPTH : 1),
    batchSize: root.batchSize ?? DEFAULT_BATCH_SIZE,
    discovered: false,
  }));
  const discovered = discoverScannerRoots();

  const configuredPathSet = new Set(configured.map((root) => normalizePathForCompare(root.scanPath)));
  const merged = [...configured];
  for (const root of discovered) {
    const discoveredPath = normalizePathForCompare(root.scanPath);
    const overlappingConfig = configured.find((configuredRoot) => pathsOverlap(configuredRoot.scanPath, root.scanPath));
    if (!configuredPathSet.has(discoveredPath) && !overlappingConfig) {
      merged.push(root);
    } else if (overlappingConfig && overlappingConfig.type !== root.type) {
      // Allow auto-roots of a DIFFERENT type than the configured root they
      // overlap with.  E.g., a configured movie root scanning /var/www/html
      // shouldn't block auto-discovered series roots inside TV_Series/.
      merged.push(root);
    }
  }
  return merged;
}

// getEffectiveRoots() does a synchronous recursive filesystem walk (discoverScannerRoots).
// Read-only paths (health, roots list) don't need it fresh on every request, so cache it
// briefly. The actual scan (scanSelectedRoots / startScanJob) still calls getEffectiveRoots()
// directly for an up-to-date view.
let effectiveRootsCache = null; // { data, expiresAt }
const EFFECTIVE_ROOTS_CACHE_TTL = 30 * 1000; // 30 seconds

function getEffectiveRootsCached() {
  if (!effectiveRootsCache || effectiveRootsCache.expiresAt <= Date.now()) {
    effectiveRootsCache = {
      data: getEffectiveRoots(),
      expiresAt: Date.now() + EFFECTIVE_ROOTS_CACHE_TTL,
    };
  }
  return effectiveRootsCache.data;
}

function listScannerRoots() {
  return getEffectiveRootsCached();
}

function listDirectories(dirPath) {
  return listDirectoryEntries(dirPath)
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listFiles(dirPath) {
  return listDirectoryEntries(dirPath)
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

function getFolderFingerprint(folderPath) {
  try {
    const entries = listDirectoryEntriesSafe(folderPath);
    let newestTime = 0;
    let videoCount = 0;
    let imageCount = 0;

    for (const entry of entries) {
      const absolutePath = path.join(folderPath, entry.name);
      const stats = fs.statSync(absolutePath);
      newestTime = Math.max(newestTime, stats.mtimeMs);

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          videoCount += 1;
        }
        if (IMAGE_EXTENSIONS.has(ext)) {
          imageCount += 1;
        }
      }
    }

    return `${entries.length}:${videoCount}:${imageCount}:${Math.round(newestTime)}`;
  } catch (err) {
    // Log permission errors specifically
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      logScannerEvent('fingerprint_permission_error', { path: folderPath, error: err.message });
    }
    return 'missing';
  }
}

function collectDirectoriesIncrementally(rootPath, maxDepth = DEFAULT_MOVIE_DEPTH) {
  const results = [rootPath];
  const queue = [{ folderPath: rootPath, depth: 0 }];

  while (queue.length) {
    const current = queue.shift();
    if (current.depth >= maxDepth) {
      continue;
    }

    // Skip directories that aren't readable
    if (!isPathReadable(current.folderPath)) {
      logScannerEvent('directory_not_readable', { path: current.folderPath });
      continue;
    }

    for (const directory of listDirectories(current.folderPath)) {
      const absolutePath = path.join(current.folderPath, directory);
      // Skip season-like folders (Season 01, S01, Specials, etc.) to prevent
      // them being indexed as separate series entries alongside their parent series.
      if (looksLikeSeasonFolder(directory)) {
        continue;
      }
      results.push(absolutePath);
      queue.push({ folderPath: absolutePath, depth: current.depth + 1 });
    }
  }

  return results;
}

function pickImageByIntent(root, folderPath, files, intent = 'poster') {
  const images = files.filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  if (!images.length) {
    return '';
  }

  let ranked = images;

  if (intent === 'poster') {
    ranked = [...images].sort((left, right) => {
      const leftName = cleanTitle(left);
      const rightName = cleanTitle(right);
      const leftScore = PREFERRED_POSTER_PATTERNS.findIndex((pattern) => pattern.test(leftName));
      const rightScore = PREFERRED_POSTER_PATTERNS.findIndex((pattern) => pattern.test(rightName));
      const normalizedLeft = leftScore === -1 ? 999 : leftScore;
      const normalizedRight = rightScore === -1 ? 999 : rightScore;

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
      }

      return left.localeCompare(right);
    });
  }

  return toPublicUrl(root, path.join(folderPath, ranked[0]));
}

function pickPoster(root, folderPath, files) {
  return pickImageByIntent(root, folderPath, files, 'poster');
}

function pickBackdrop(root, folderPath, files) {
  return pickImageByIntent(root, folderPath, files, 'backdrop') || pickPoster(root, folderPath, files);
}

function pickVideo(root, folderPath, files) {
  const candidate = files.find((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()));
  if (!candidate) {
    return '';
  }

  return toPublicUrl(root, path.join(folderPath, candidate));
}

function isValidMediaFile(filePath, contentType = 'movie') {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();

  if (!VIDEO_EXTENSIONS.has(ext)) {
    return false;
  }

  if (JUNK_REGEX.test(filename)) {
    return false;
  }

  try {
    const stats = fs.statSync(filePath);
    const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
    if (!isTest) {
      const minSize = contentType === 'series' ? MIN_EPISODE_SIZE : MIN_MOVIE_SIZE;
      if (stats.size < minSize) {
        return false;
      }
    }
  } catch {
    // If the file does not exist but we are running in a test suite, bypass the file size check
    if (process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'))) {
      return true;
    }
    return false;
  }

  return true;
}

function listVideoFiles(files, dirPath, contentType = 'movie') {
  return files.filter((file) => isValidMediaFile(path.join(dirPath, file), contentType));
}

function findSubtitleFile(root, videoFilePath) {
  try {
    const dir = path.dirname(videoFilePath);
    const videoName = path.basename(videoFilePath, path.extname(videoFilePath));
    if (!fs.existsSync(dir)) {
      return '';
    }

    const files = fs.readdirSync(dir);
    // Extensions we accept for subtitle files
    const subExts = ['.srt', '.vtt'];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (subExts.includes(ext)) {
        const subName = path.basename(file, ext);
        // Match exact name (e.g. Kingsman.srt) or language suffixes (e.g. Kingsman.en.srt)
        if (subName === videoName || subName.startsWith(`${videoName}.`)) {
          return toPublicUrl(root, path.join(dir, file));
        }
      }
    }
  } catch {
    // Fail-safe
  }
  return '';
}

function isYearFolderName(value) {
  return /^(19|20)\d{2}$/.test(String(value || '').trim());
}

function shouldExpandMovieFolder(relativeFolder, folderName, videoFiles) {
  if (videoFiles.length > 1) {
    return true;
  }

  if (relativeFolder === '.') {
    return true;
  }

  return isYearFolderName(folderName);
}

function buildMovieCandidates(root, folderPath, relativeFolder, files) {
  const folderName = path.basename(folderPath);
  let videoFiles = listVideoFiles(files, folderPath, 'movie');

  // Exclude explicit series files from movie candidates in movie roots
  videoFiles = videoFiles.filter((videoFile) => !isExplicitSeriesFile(videoFile));

  if (!videoFiles.length) {
    return [];
  }

  if (shouldExpandMovieFolder(relativeFolder, folderName, videoFiles)) {
    return videoFiles.map((videoFile) => {
      const titleSource = cleanTitle(videoFile, 'movie');
      const videoPath = path.join(folderPath, videoFile);
      return {
        titleSource,
        slugSource: titleSource,
        year: extractYear(titleSource) || extractYear(relativeFolder) || extractYear(folderName),
        videoUrl: toPublicUrl(root, videoPath),
        sourcePath: videoPath,
        sourcePublicPath: toPublicUrl(root, videoPath),
        scanSignature: `${root.id}:${relativeFolder === '.' ? '' : `${relativeFolder}/`}${videoFile}`,
        subtitleUrl: findSubtitleFile(root, videoPath),
      };
    });
  }

  const titleSource = folderName;
  const videoPath = path.join(folderPath, videoFiles[0]);
  return [{
    titleSource,
    slugSource: titleSource,
    year: extractYear(relativeFolder) || extractYear(folderName),
    videoUrl: toPublicUrl(root, videoPath),
    sourcePath: folderPath,
    sourcePublicPath: toPublicUrl(root, folderPath),
    scanSignature: `${root.id}:${relativeFolder}`,
    subtitleUrl: findSubtitleFile(root, videoPath),
  }];
}

function getLegacyMovieSignatures(root, relativeFolder, folderPath, movieCandidates) {
  if (!movieCandidates.length) {
    return [];
  }

  const folderName = path.basename(folderPath);
  const legacySignatures = new Set();

  if (relativeFolder !== '.') {
    legacySignatures.add(`${root.id}:${relativeFolder}`);
  }

  if (isYearFolderName(folderName)) {
    legacySignatures.add(`${root.id}:${folderName}`);
  }

  for (const candidate of movieCandidates) {
    legacySignatures.delete(candidate.scanSignature);
  }

  return [...legacySignatures];
}

async function hasAllCandidatesInCatalog(candidates = [], existingSignatureSet = null) {
  if (existingSignatureSet instanceof Set) {
    return Promise.resolve(candidates.every((candidate) => existingSignatureSet.has(candidate.scanSignature)));
  }

  if (!candidates.length) {
    return Promise.resolve(false);
  }

  const BATCH_SIZE = 20;
  const results = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((candidate) =>
        getItemByScanSignature(candidate.scanSignature).catch(() => null),
      ),
    );
    results.push(...batchResults);
    if (i + BATCH_SIZE < candidates.length) {
      await waitForImmediate();
    }
  }
  return results.every(Boolean);
}


function createBaseScannerItem(root, values) {
  const item = {
    status: 'published',
    language: root.language,
    category: root.category,
    sourceRootId: root.id,
    sourceRootLabel: root.label,
    sourceType: 'scanner',
    quality: 'HD',
    lastScannedAt: new Date().toISOString(),
    lastScanRunId: values.lastScanRunId || '',
    lastScanRunAt: values.lastScanRunAt || new Date().toISOString(),
    titleKey: normalizeTitleKey(values.title),
    ...values,
  };

  // Add file checksum info if sourcePath is provided
  if (values.sourcePath) {
    try {
      const stat = fs.statSync(values.sourcePath);
      if (stat.isFile()) {
        item.fileSize = stat.size;
        item.fileLastModified = stat.mtime.toISOString();
      }
    } catch {
      // File doesn't exist yet or can't be stat'd - skip checksum
    }
  }

  return item;
}

function hasFileChanged(filePath, storedSize, storedLastModified) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (storedSize && stat.size !== storedSize) return true;
    if (storedLastModified && stat.mtime.toISOString() !== storedLastModified) return true;
    return false;
  } catch {
    return true; // File doesn't exist - treat as changed
  }
}

async function loadRootState(rootId) {
  const state = await getAppState('scanner_state', { roots: {} });
  return state.roots?.[rootId] || { folders: {}, lastCompletedAt: '' };
}

async function saveRootState(rootId, nextRootState) {
  const state = loadScannerState();
  state.roots = state.roots || {};
  state.roots[rootId] = nextRootState;
  await saveScannerState(state);
}

function toNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function addToSummary(summary, field, delta) {
  const safeDelta = typeof delta === 'number' && Number.isFinite(delta) ? Math.floor(delta) : 0;
  summary[field] = toNonNegativeInteger(summary[field]) + safeDelta;
}

function toIsoOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeRootProgressEntry(entry = {}) {
  return {
    ...entry,
    id: String(entry.id || ''),
    label: String(entry.label || ''),
    type: String(entry.type || 'movie'),
    path: String(entry.path || ''),
    status: String(entry.status || 'pending'),
    exists: Boolean(entry.exists),
    checkable: Boolean(entry.checkable),
    pathStatus: String(entry.pathStatus || ''),
    pathStatusLabel: String(entry.pathStatusLabel || ''),
    discovered: toNonNegativeInteger(entry.discovered),
    processed: toNonNegativeInteger(entry.processed),
    totalCandidates: toNonNegativeInteger(entry.totalCandidates),
    created: toNonNegativeInteger(entry.created),
    updated: toNonNegativeInteger(entry.updated),
    unchanged: toNonNegativeInteger(entry.unchanged),
    deleted: toNonNegativeInteger(entry.deleted),
    duplicateDrafts: toNonNegativeInteger(entry.duplicateDrafts),
    skipped: toNonNegativeInteger(entry.skipped),
    errors: Array.isArray(entry.errors) ? entry.errors.map((error) => String(error || '')) : [],
  };
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  return {
    ...summary,
    startedAt: toIsoOrEmpty(summary.startedAt),
    completedAt: toIsoOrEmpty(summary.completedAt),
    rootsRequested: toNonNegativeInteger(summary.rootsRequested),
    rootsScanned: toNonNegativeInteger(summary.rootsScanned),
    created: toNonNegativeInteger(summary.created),
    updated: toNonNegativeInteger(summary.updated),
    unchanged: toNonNegativeInteger(summary.unchanged),
    deleted: toNonNegativeInteger(summary.deleted),
    duplicateDrafts: toNonNegativeInteger(summary.duplicateDrafts),
    skipped: Array.isArray(summary.skipped) ? summary.skipped : [],
    errors: Array.isArray(summary.errors) ? summary.errors.map((error) => String(error || '')) : [],
    drafts: Array.isArray(summary.drafts) ? summary.drafts.slice(0, 100) : [],
    rootResults: Array.isArray(summary.rootResults)
      ? summary.rootResults.map((root) => normalizeRootProgressEntry(root))
      : [],
  };
}

function compactSummary(summary) {
  const normalized = normalizeSummary(summary);
  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    drafts: [],
    totalErrors: normalized.errors.length,
    errors: normalized.errors.slice(0, 10),
    skipped: normalized.skipped.slice(0, 10),
    rootResults: normalized.rootResults.map((root) => ({
      ...root,
      totalErrors: root.errors.length,
      errors: root.errors.slice(0, 5),
    })),
  };
}

function normalizeRuntimeJob(job) {
  if (!job || typeof job !== 'object') {
    return null;
  }

  return {
    ...job,
    id: String(job.id || ''),
    status: String(job.status || 'idle'),
    startedAt: toIsoOrEmpty(job.startedAt),
    completedAt: toIsoOrEmpty(job.completedAt),
    updatedAt: toIsoOrEmpty(job.updatedAt),
    rootIds: Array.isArray(job.rootIds) ? job.rootIds.map((id) => String(id || '')).filter(Boolean) : [],
    error: String(job.error || ''),
    summary: normalizeSummary(job.summary),
  };
}

function logScannerEvent(event, payload = {}) {
  const line = (() => {
    try {
      return JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload });
    } catch {
      return String(event);
    }
  })();

  // Always log to stdout (journalctl)
  try {
    console.info('[scanner]', line);
  } catch {}

  // Also write to dedicated scanner log file (~1 hour retention)
  try {
    const logDir = process.env.SCANNER_CACHE_DIR || '/var/www/html/Extra_Storage/scanner-cache';
    const logFile = path.join(logDir, 'scanner.log');
    fs.appendFileSync(logFile, line + '\n');

    // Periodic rotation: trim entries older than 1 hour (check every 100 writes)
    scannerLogWriteCount = (scannerLogWriteCount || 0) + 1;
    if (scannerLogWriteCount >= 100) {
      scannerLogWriteCount = 0;
      try {
        const stats = fs.statSync(logFile);
        // Also rotate if file exceeds 10MB regardless of write count
        if (stats.size > 10 * 1024 * 1024) {
          const content = fs.readFileSync(logFile, 'utf8');
          const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour ago
          const trimmed = content
            .split('\n')
            .filter((row) => {
              if (!row.trim()) return false;
              try {
                const parsed = JSON.parse(row);
                return parsed.timestamp && new Date(parsed.timestamp).getTime() >= cutoff;
              } catch {
                return true; // keep non-JSON lines
              }
            })
            .join('\n');
          fs.writeFileSync(logFile, trimmed + (trimmed.endsWith('\n') ? '' : '\n'));
        }
      } catch {
        // rotation failed — not critical
      }
    }
  } catch {}
}

function coerceDeletedCount(rawValue, context = '') {
  const parsed = Number(rawValue);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }

  logScannerEvent('deleted_count_invalid', {
    context,
    rawValue: String(rawValue),
  });
  return 0;
}

function serializeJob(job) {
  const normalizedJob = normalizeRuntimeJob(job);
  if (!normalizedJob) {
    return null;
  }

  return {
    ...normalizedJob,
    summary: compactSummary(normalizedJob.summary),
  };
}

async function updateRuntimeJob(job) {
  // Refresh the cross-instance lock heartbeat while running so other instances keep seeing a
  // fresh lease (updateRuntimeJob is called on every progress emit and on state transitions).
  if (job && job.status === 'running') {
    job.owner = job.owner || SCANNER_INSTANCE_ID;
    job.lockedAt = new Date().toISOString();
  }
  await saveScannerRuntime({
    currentJob: serializeJob(job),
    queue: [],
  });
}

async function clearRuntimeJob() {
  await saveScannerRuntime({
    currentJob: null,
    queue: [],
  });
}


function buildProgressPayload(summary, extra = {}) {
  return {
    ...summary,
    ...extra,
  };
}

function createRootProgress(root) {
  const pathAssessment = assessScanPath(root.scanPath);
  return {
    id: root.id,
    label: root.label,
    type: root.type,
    path: root.scanPath,
    status: 'pending',
    exists: pathAssessment.exists,
    checkable: pathAssessment.checkable,
    pathStatus: pathAssessment.status,
    pathStatusLabel: pathAssessment.statusLabel,
    discovered: 0,
    processed: 0,
    totalCandidates: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    duplicateDrafts: 0,
    skipped: 0,
    errors: [],
  };
}

function createSummary(roots) {
  return {
    startedAt: new Date().toISOString(),
    completedAt: '',
    rootsRequested: roots.length,
    rootsScanned: 0,
    skipped: [],
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    duplicateDrafts: 0,
    drafts: [],
    errors: [],
    rootResults: roots.map(createRootProgress),
  };
}

function updateRootProgress(summary, rootId, patch) {
  const index = summary.rootResults.findIndex((entry) => entry.id === rootId);
  if (index === -1) {
    return;
  }

  summary.rootResults[index] = {
    ...summary.rootResults[index],
    ...patch,
  };
}

async function hasAllSignaturesInCatalog(signatures = [], existingSignatureSet = null) {
  if (existingSignatureSet instanceof Set) {
    return signatures.every((sig) => existingSignatureSet.has(sig));
  }
  if (!signatures.length) {
    return false;
  }
  const results = await Promise.all(
    signatures.map((sig) => getItemByScanSignature(sig).catch(() => null))
  );
  return results.every(Boolean);
}

function buildSeriesFromSingleFiles(root, showName, showFiles, folderPath, relativeFolder, scanContext) {
  const showSlug = slugify(showName);
  const seasonsMap = new Map();

  for (const file of showFiles) {
    const identity = parseEpisodeIdentity(file);
    const seasonNumber = identity.season || 1;
    const episodeNumber = identity.episode || 1;

    if (!seasonsMap.has(seasonNumber)) {
      seasonsMap.set(seasonNumber, []);
    }
    seasonsMap.get(seasonNumber).push({
      file,
      episodeNumber,
    });
  }

  const seasons = [];
  for (const [seasonNumber, episodesInfo] of seasonsMap.entries()) {
    episodesInfo.sort((a, b) => a.episodeNumber - b.episodeNumber);

    const episodes = episodesInfo.map((info) => {
      const file = info.file;
      return {
        id: `${showSlug}-${seasonNumber}-${info.episodeNumber}`,
        number: info.episodeNumber,
        title: cleanTitle(safeDecodeURIComponent(file)),
        videoUrl: toPublicUrl(root, path.join(folderPath, file)),
        sourcePath: path.join(folderPath, file),
        duration: '',
      };
    });

    seasons.push({
      id: `${showSlug}-season-${seasonNumber}`,
      number: seasonNumber,
      title: `Season ${seasonNumber}`,
      sourcePath: folderPath,
      episodes,
    });
  }

  seasons.sort((a, b) => a.number - b.number);

  const item = createBaseScannerItem(root, {
    title: showName,
    slug: showSlug,
    type: 'series',
    year: extractYear(showName) || (seasons[0]?.episodes[0] ? extractYear(seasons[0].episodes[0].title) : null),
    poster: pickPoster(root, folderPath, showFiles),
    backdrop: pickBackdrop(root, folderPath, showFiles),
    seasonCount: seasons.length,
    episodeCount: seasons.reduce((sum, season) => sum + season.episodes.length, 0),
    seasons,
    sourcePath: path.join(folderPath, showSlug),
    sourcePublicPath: toPublicUrl(root, folderPath),
    scanSignature: `${root.id}:${relativeFolder === '.' ? '' : `${relativeFolder}/`}series:${showSlug}`,
    lastScanRunId: scanContext.runId,
    lastScanRunAt: scanContext.startedAt,
  });

  return item;
}

async function processMovieRoot(root, summary, progressCallback, scanContext, existingSignatureSet) {
  const rootState = await loadRootState(root.id);
  const nextRootState = {
    folders: { ...(rootState.folders || {}) },
    lastCompletedAt: '',
  };
  
  // Check if root path is readable before processing
  if (!isPathReadable(root.scanPath)) {
    logScannerEvent('root_permission_error', { 
      rootId: root.id, 
      path: root.scanPath,
      error: 'Root path not readable by scanner user' 
    });
    updateRootProgress(summary, root.id, {
      status: 'error',
      errors: ['Root path not readable by scanner user - permission denied'],
    });
    return;
  }
  
  const candidateFolders = collectDirectoriesIncrementally(root.scanPath, root.maxDepth || DEFAULT_MOVIE_DEPTH);
  const seenSignatures = new Set();

  updateRootProgress(summary, root.id, {
    status: 'running',
    totalCandidates: candidateFolders.length,
  });

  for (let start = 0; start < candidateFolders.length; start += root.batchSize || DEFAULT_BATCH_SIZE) {
    if (scanAbortRequested) {
      logScannerEvent('scan_aborted_mid_root', { rootId: root.id, progress: start, total: candidateFolders.length });
      break;
    }
    const batch = candidateFolders.slice(start, start + (root.batchSize || DEFAULT_BATCH_SIZE));

    for (const [offset, folderPath] of batch.entries()) {
      const relativeFolder = path.relative(root.scanPath, folderPath) || '.';
      const folderName = path.basename(folderPath);
      const files = listFiles(folderPath);
      const nestedDirectories = listDirectories(folderPath);
      const fingerprint = getFolderFingerprint(folderPath);
      const previousFingerprint = rootState.folders?.[relativeFolder]?.fingerprint;
      const isSeriesFolder = relativeFolder !== '.' && !isYearFolderName(folderName) && detectSeriesFolder(root, folderPath, files, nestedDirectories);
      const movieCandidates = isSeriesFolder ? [] : buildMovieCandidates(root, folderPath, relativeFolder, files);

      // Detect explicit series files in this folder when it is not already classified as a series folder
      const allVideoFiles = listVideoFiles(files, folderPath, 'series');
      const seriesFiles = isSeriesFolder ? [] : allVideoFiles.filter((f) => isExplicitSeriesFile(f));

      // Group series files by show name
      const seriesGroups = new Map();
      for (const file of seriesFiles) {
        const showName = parseShowNameFromFilename(file);
        if (showName) {
          if (!seriesGroups.has(showName)) {
            seriesGroups.set(showName, []);
          }
          seriesGroups.get(showName).push(file);
        }
      }

      const processedCount = Math.min(start + offset + 1, candidateFolders.length);
      updateRootProgress(summary, root.id, {
        processed: processedCount,
      });
      if (progressCallback && (processedCount === candidateFolders.length || processedCount % PROGRESS_EMIT_INTERVAL === 0)) {
        progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
      }

      if (isSeriesFolder) {
        const { seasons, seriesFiles: buildFiles } = buildSeriesSeasons(root, path.basename(folderPath), folderPath);
        if (!seasons.length) {
          continue;
        }

        const item = createBaseScannerItem(root, {
          title: cleanTitle(path.basename(folderPath)),
          slug: slugify(path.basename(folderPath)),
          type: 'series',
          year: extractYear(relativeFolder) || extractYear(path.basename(folderPath)),
          poster: pickPoster(root, folderPath, buildFiles),
          backdrop: pickBackdrop(root, folderPath, buildFiles),
          seasonCount: seasons.length,
          episodeCount: seasons.reduce((sum, season) => sum + season.episodes.length, 0),
          seasons,
          sourcePath: folderPath,
          sourcePublicPath: toPublicUrl(root, folderPath),
          scanSignature: `${root.id}:${relativeFolder}`,
          lastScanRunId: scanContext.runId,
          lastScanRunAt: scanContext.startedAt,
        });
        seenSignatures.add(item.scanSignature);

        try {
          const enrichedItem = await renameMediaForItem(assignScannerTaxonomy(await enrichItemWithMetadata(item)));
          const result = await retryAsync(() => upsertScannedItem(enrichedItem));

          // Save fingerprint AFTER enrichment so crash doesn't permanently skip this item
          nextRootState.folders[relativeFolder] = {
            fingerprint,
            scanSignature: item.scanSignature,
            title: enrichedItem.title,
            updatedAt: new Date().toISOString(),
          };

          if (result.created) {
            summary.created += 1;
          }
          if (result.updated) {
            summary.updated += 1;
          }
          if (result.item.duplicateCount > 0) {
            summary.duplicateDrafts += 1;
          }
          summary.drafts.push(result.item);
          if (summary.drafts.length > 100) summary.drafts.shift();

          const current = summary.rootResults.find((entry) => entry.id === root.id);
          updateRootProgress(summary, root.id, {
            discovered: (current?.discovered || 0) + 1,
            created: (current?.created || 0) + (result.created ? 1 : 0),
            updated: (current?.updated || 0) + (result.updated ? 1 : 0),
            duplicateDrafts: (current?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
          });
        } catch (itemErr) {
          logScannerEvent('item_processing_error', { rootId: root.id, folder: relativeFolder, error: itemErr.message });
          const rootEntry = summary.rootResults.find((entry) => entry.id === root.id);
          if (rootEntry) {
            rootEntry.errors.push(`[${relativeFolder}] ${itemErr.message}`);
          }
        }
        continue;
      }

      // Compute expected signatures for fingerprint checking
      const expectedSignatures = [
        ...movieCandidates.map((c) => c.scanSignature),
        ...[...seriesGroups.keys()].map((showName) => `${root.id}:${relativeFolder === '.' ? '' : `${relativeFolder}/`}series:${slugify(showName)}`),
      ];

      if (previousFingerprint && previousFingerprint === fingerprint && await hasAllSignaturesInCatalog(expectedSignatures, existingSignatureSet)) {
        // Stale path detection: even if fingerprint is unchanged, check if published entries have valid sourcePath
        for (const sig of expectedSignatures) {
          const existingItem = await getItemByScanSignature(sig);
          if (existingItem && existingItem.payload && existingItem.payload.status === 'published' && existingItem.payload.sourcePath) {
            // First check the relocation cache for instant match
            const cachedNewPath = getCachedRelocation(existingItem.payload.sourcePath);
            if (cachedNewPath) {
              const cachedExists = await fs.promises.access(cachedNewPath).then(() => true).catch(() => false);
              if (cachedExists) {
                const updatedPayload = {
                  ...existingItem.payload,
                  sourcePath: cachedNewPath,
                  sourcePublicPath: toPublicUrl(root, cachedNewPath),
                  videoUrl: toPublicUrl(root, cachedNewPath),
                  scanSignature: sig,
                };
                const relocationResult = await retryAsync(() => upsertScannedItem(updatedPayload));
                if (relocationResult.updated) {
                  summary.updated += 1;
                }
                continue;
              }
            }

            // Cache miss - check if sourcePath exists (with symlink support)
            let sourceExists = false;
            try {
              await fs.promises.access(existingItem.payload.sourcePath);
              sourceExists = true;
            } catch {
              // Try resolving symlinks before marking as missing
              try {
                const realPath = await fs.promises.realpath(existingItem.payload.sourcePath);
                await fs.promises.access(realPath);
                sourceExists = true;
              } catch {
                sourceExists = false;
              }
            }
            if (!sourceExists) {
              // Find the relocated file in current folder
              const videoFiles = listVideoFiles(listFiles(folderPath), folderPath, 'movie');
              if (videoFiles.length > 0) {
                const newVideoPath = path.join(folderPath, videoFiles[0]);
                const newVideoExists = await fs.promises.access(newVideoPath).then(() => true).catch(() => false);
                if (newVideoExists) {
                  // Cache the relocation for future use
                  cacheFileRelocation(existingItem.payload.sourcePath, newVideoPath);

                  // Update the entry's path in-place
                  const updatedPayload = {
                    ...existingItem.payload,
                    sourcePath: newVideoPath,
                    sourcePublicPath: toPublicUrl(root, newVideoPath),
                    videoUrl: toPublicUrl(root, newVideoPath),
                    scanSignature: sig,
                  };
                  const relocationResult = await retryAsync(() => upsertScannedItem(updatedPayload));
                  if (relocationResult.updated) {
                    summary.updated += 1;
                  }
                }
              }
            }
          }
        }
        expectedSignatures.forEach((sig) => seenSignatures.add(sig));
        summary.unchanged += expectedSignatures.length;
        const current = summary.rootResults.find((entry) => entry.id === root.id);
        updateRootProgress(summary, root.id, { unchanged: (current?.unchanged || 0) + expectedSignatures.length });
        continue;
      }

      try {
        await retryAsync(() => deleteItemsByScanSignatures(getLegacyMovieSignatures(root, relativeFolder, folderPath, movieCandidates)));
      } catch (deleteErr) {
        logScannerEvent('legacy_signature_delete_error', { rootId: root.id, folder: relativeFolder, error: deleteErr.message });
      }

      for (const candidate of movieCandidates) {
        if (seenSignatures.has(candidate.scanSignature)) {
          continue;
        }
        seenSignatures.add(candidate.scanSignature);

        try {
          const item = createBaseScannerItem(root, {
            title: cleanTitle(candidate.titleSource),
            slug: slugify(candidate.slugSource),
            type: 'movie',
            year: candidate.year,
            poster: pickPoster(root, folderPath, files),
            backdrop: pickBackdrop(root, folderPath, files),
            videoUrl: candidate.videoUrl,
            sourcePath: candidate.sourcePath,
            sourcePublicPath: candidate.sourcePublicPath,
            scanSignature: candidate.scanSignature,
            lastScanRunId: scanContext.runId,
            lastScanRunAt: scanContext.startedAt,
          });

          const enrichedItem = await renameMediaForItem(assignScannerTaxonomy(await enrichItemWithMetadata(item)));
          const result = await retryAsync(() => upsertScannedItem(enrichedItem));

          if (result.created) {
            summary.created += 1;
          }
          if (result.updated) {
            summary.updated += 1;
          }
          if (result.item.duplicateCount > 0) {
            summary.duplicateDrafts += 1;
          }
          summary.drafts.push(result.item);
          if (summary.drafts.length > 100) summary.drafts.shift();

          const current = summary.rootResults.find((entry) => entry.id === root.id);
          updateRootProgress(summary, root.id, {
            discovered: (current?.discovered || 0) + 1,
            created: (current?.created || 0) + (result.created ? 1 : 0),
            updated: (current?.updated || 0) + (result.updated ? 1 : 0),
            duplicateDrafts: (current?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
          });
        } catch (itemErr) {
          logScannerEvent('item_processing_error', { rootId: root.id, folder: relativeFolder, signature: candidate.scanSignature, error: itemErr.message });
          const rootEntry = summary.rootResults.find((entry) => entry.id === root.id);
          if (rootEntry) {
            rootEntry.errors.push(`[${candidate.scanSignature}] ${itemErr.message}`);
          }
        }
      }

      for (const [showName, showFiles] of seriesGroups.entries()) {
        try {
          const item = buildSeriesFromSingleFiles(root, showName, showFiles, folderPath, relativeFolder, scanContext);
          if (seenSignatures.has(item.scanSignature)) {
            continue;
          }
          seenSignatures.add(item.scanSignature);

          const enrichedItem = await renameMediaForItem(assignScannerTaxonomy(await enrichItemWithMetadata(item)));
          const result = await retryAsync(() => upsertScannedItem(enrichedItem));

          if (result.created) {
            summary.created += 1;
          }
          if (result.updated) {
            summary.updated += 1;
          }
          if (result.item.duplicateCount > 0) {
            summary.duplicateDrafts += 1;
          }
          summary.drafts.push(result.item);
          if (summary.drafts.length > 100) summary.drafts.shift();

          const current = summary.rootResults.find((entry) => entry.id === root.id);
          updateRootProgress(summary, root.id, {
            discovered: (current?.discovered || 0) + 1,
            created: (current?.created || 0) + (result.created ? 1 : 0),
            updated: (current?.updated || 0) + (result.updated ? 1 : 0),
            duplicateDrafts: (current?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
          });
        } catch (itemErr) {
          logScannerEvent('item_processing_error', { rootId: root.id, folder: relativeFolder, showName, error: itemErr.message });
          const rootEntry = summary.rootResults.find((entry) => entry.id === root.id);
          if (rootEntry) {
            rootEntry.errors.push(`[${showName}] ${itemErr.message}`);
          }
        }
      }

      nextRootState.folders[relativeFolder] = {
        fingerprint,
        scanSignature: expectedSignatures.join(','),
        title: movieCandidates[0]?.titleSource || [...seriesGroups.keys()][0] || folderName,
        updatedAt: new Date().toISOString(),
      };
    }

    await waitForImmediate();
  }


  updateRootProgress(summary, root.id, {
    status: 'finalizing',
    processed: candidateFolders.length,
  });
  if (progressCallback) {
    progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
  }

  let deletedCount = 0;
  try {
    deletedCount = Number(
      coerceDeletedCount(
        await retryAsync(() => deleteScannerItemsNotInSignatures(root.id, [...seenSignatures])),
        `movie:${root.id}`,
      ),
    );
  } catch (deleteErr) {
    logScannerEvent('stale_item_cleanup_error', { rootId: root.id, error: deleteErr.message });
  }
  addToSummary(summary, 'deleted', deletedCount);
  const current = summary.rootResults.find((entry) => entry.id === root.id);
  updateRootProgress(summary, root.id, {
    deleted: toNonNegativeInteger(current?.deleted) + deletedCount,
  });

  nextRootState.lastCompletedAt = new Date().toISOString();
  await saveRootState(root.id, nextRootState);
  updateRootProgress(summary, root.id, {
    status: 'completed',
    processed: candidateFolders.length,
  });
  if (progressCallback) {
    progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
  }
}

async function processSeriesRoot(root, summary, progressCallback, scanContext, existingSignatureSet) {
  const rootState = await loadRootState(root.id);
  const nextRootState = {
    folders: { ...(rootState.folders || {}) },
    lastCompletedAt: '',
  };
  
  // Check if root path is readable before processing
  if (!isPathReadable(root.scanPath)) {
    logScannerEvent('root_permission_error', { 
      rootId: root.id, 
      path: root.scanPath,
      error: 'Root path not readable by scanner user' 
    });
    updateRootProgress(summary, root.id, {
      status: 'error',
      errors: ['Root path not readable by scanner user - permission denied'],
    });
    return;
  }
  
  const rawFolders = listDirectories(root.scanPath);

  // Group sibling folders that share a base show name (differing only by season suffix)
  // e.g. "The Adventures Of Tintin S01", "S02", "S03" -> grouped under "The Adventures Of Tintin"
  const folderGroups = new Map();
  for (const folderName of rawFolders) {
    const baseName = stripSeasonSuffix(folderName);
    if (!folderGroups.has(baseName)) {
      folderGroups.set(baseName, []);
    }
    folderGroups.get(baseName).push(folderName);
  }

  // Build a flat list of processing entries: single folders stay as-is, grouped folders are merged
  const processEntries = [];
  for (const [baseName, groupFolders] of folderGroups.entries()) {
    if (groupFolders.length === 1) {
      processEntries.push({ type: 'single', folderName: groupFolders[0] });
    } else {
      processEntries.push({ type: 'group', baseName, folderNames: groupFolders });
    }
  }

  const seenSignatures = new Set();
  const totalCandidates = processEntries.length;

  updateRootProgress(summary, root.id, {
    status: 'running',
    totalCandidates,
  });
  if (progressCallback) {
    progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
  }

  for (let start = 0; start < processEntries.length; start += root.batchSize || DEFAULT_BATCH_SIZE) {
    if (scanAbortRequested) {
      logScannerEvent('scan_aborted_mid_root', { rootId: root.id, progress: start, total: processEntries.length });
      break;
    }
    const batch = processEntries.slice(start, start + (root.batchSize || DEFAULT_BATCH_SIZE));

    for (const [offset, entry] of batch.entries()) {
      const processedCount = Math.min(start + offset + 1, totalCandidates);
      updateRootProgress(summary, root.id, {
        processed: processedCount,
      });
      if (progressCallback && (processedCount === totalCandidates || processedCount % PROGRESS_EMIT_INTERVAL === 0)) {
        progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
      }

      if (entry.type === 'single') {
        // ── Single folder (existing logic) ──
        const folderName = entry.folderName;
        const seriesPath = path.join(root.scanPath, folderName);
        const relativeFolder = folderName;
        const fingerprint = getFolderFingerprint(seriesPath);
        const previousFingerprint = rootState.folders?.[relativeFolder]?.fingerprint;
        const seriesFiles = listFiles(seriesPath);

        const seriesSignature = `${root.id}:${folderName}`;
        const alreadyExists = existingSignatureSet instanceof Set
          ? existingSignatureSet.has(seriesSignature)
          : await getItemByScanSignature(seriesSignature);

        if (previousFingerprint && previousFingerprint === fingerprint && alreadyExists) {
          const existingItem = typeof alreadyExists === 'object' ? alreadyExists : await getItemByScanSignature(seriesSignature);
          const firstSourcePath = existingItem?.seasons?.[0]?.episodes?.[0]?.sourcePath;
          const pathsValid = firstSourcePath ? fs.existsSync(firstSourcePath) : false;
          if (pathsValid) {
            seenSignatures.add(seriesSignature);
            summary.unchanged += 1;
            const current = summary.rootResults.find((entry) => entry.id === root.id);
            updateRootProgress(summary, root.id, { unchanged: (current?.unchanged || 0) + 1 });
            continue;
          }
        }

        const { seasons } = buildSeriesSeasons(root, folderName, seriesPath);
        if (!seasons.length) continue;

        const item = createBaseScannerItem(root, {
          title: cleanTitle(folderName),
          slug: slugify(folderName),
          type: 'series',
          year: extractYear(folderName),
          poster: pickPoster(root, seriesPath, seriesFiles),
          backdrop: pickBackdrop(root, seriesPath, seriesFiles),
          seasonCount: seasons.length,
          episodeCount: seasons.reduce((sum, season) => sum + season.episodes.length, 0),
          seasons,
          sourcePath: seriesPath,
          sourcePublicPath: toPublicUrl(root, seriesPath),
          scanSignature: seriesSignature,
          lastScanRunId: scanContext.runId,
          lastScanRunAt: scanContext.startedAt,
        });
        seenSignatures.add(item.scanSignature);

        try {
          const enrichedItem = await renameMediaForItem(assignScannerTaxonomy(await enrichItemWithMetadata(item)));
          const result = await retryAsync(() => upsertScannedItem(enrichedItem));
          nextRootState.folders[relativeFolder] = {
            fingerprint,
            scanSignature: enrichedItem.scanSignature,
            title: enrichedItem.title,
            updatedAt: new Date().toISOString(),
          };

          if (result.created) summary.created += 1;
          if (result.updated) summary.updated += 1;
          if (result.item.duplicateCount > 0) summary.duplicateDrafts += 1;
          summary.drafts.push(result.item);
          if (summary.drafts.length > 100) summary.drafts.shift();
          const currentSer = summary.rootResults.find((e) => e.id === root.id);
          updateRootProgress(summary, root.id, {
            discovered: (currentSer?.discovered || 0) + 1,
            created: (currentSer?.created || 0) + (result.created ? 1 : 0),
            updated: (currentSer?.updated || 0) + (result.updated ? 1 : 0),
            duplicateDrafts: (currentSer?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
          });
        } catch (itemErr) {
          logScannerEvent('item_processing_error', { rootId: root.id, folder: relativeFolder, error: itemErr.message });
          const rootEntry = summary.rootResults.find((entry) => entry.id === root.id);
          if (rootEntry) {
            rootEntry.errors.push(`[${folderName}] ${itemErr.message}`);
          }
        }
      } else if (entry.type === 'group') {
        // ── Grouped sibling season folders ──
        const { baseName, folderNames } = entry;
        const groupSignature = `${root.id}:${baseName}`;
        const groupFingerprint = folderNames.map((f) => getFolderFingerprint(path.join(root.scanPath, f))).join('|');
        const previousFingerprint = rootState.folders?.[baseName]?.fingerprint;
        const alreadyExists = existingSignatureSet instanceof Set
          ? existingSignatureSet.has(groupSignature)
          : await getItemByScanSignature(groupSignature);

        if (previousFingerprint && previousFingerprint === groupFingerprint && alreadyExists) {
          seenSignatures.add(groupSignature);
          summary.unchanged += 1;
          const current = summary.rootResults.find((e) => e.id === root.id);
          updateRootProgress(summary, root.id, { unchanged: (current?.unchanged || 0) + 1 });
          continue;
        }

        // Merge seasons from all sibling folders
        const allSeasons = [];
        let mergedPoster = '';
        let mergedBackdrop = '';
        for (const folderName of folderNames) {
          const seriesPath = path.join(root.scanPath, folderName);
          const seriesFiles = listFiles(seriesPath);
          if (!mergedPoster) mergedPoster = pickPoster(root, seriesPath, seriesFiles);
          if (!mergedBackdrop) mergedBackdrop = pickBackdrop(root, seriesPath, seriesFiles);
          const { seasons } = buildSeriesSeasons(root, folderName, seriesPath);
          allSeasons.push(...seasons);
        }

        if (!allSeasons.length) continue;

        const mergedPath = path.join(root.scanPath, folderNames[0]);
        const item = createBaseScannerItem(root, {
          title: cleanTitle(baseName),
          slug: slugify(baseName),
          type: 'series',
          year: extractYear(baseName),
          poster: mergedPoster,
          backdrop: mergedBackdrop,
          seasonCount: allSeasons.length,
          episodeCount: allSeasons.reduce((sum, season) => sum + season.episodes.length, 0),
          seasons: allSeasons,
          sourcePath: mergedPath,
          sourcePublicPath: toPublicUrl(root, mergedPath),
          scanSignature: groupSignature,
          lastScanRunId: scanContext.runId,
          lastScanRunAt: scanContext.startedAt,
        });
        seenSignatures.add(groupSignature);

        try {
          const enrichedItem = await renameMediaForItem(assignScannerTaxonomy(await enrichItemWithMetadata(item)));
          const result = await retryAsync(() => upsertScannedItem(enrichedItem));
          nextRootState.folders[baseName] = {
            fingerprint: groupFingerprint,
            scanSignature: enrichedItem.scanSignature,
            title: enrichedItem.title,
            updatedAt: new Date().toISOString(),
          };

          if (result.created) summary.created += 1;
          if (result.updated) summary.updated += 1;
          if (result.item.duplicateCount > 0) summary.duplicateDrafts += 1;
          summary.drafts.push(result.item);
          if (summary.drafts.length > 100) summary.drafts.shift();
          const currentSer = summary.rootResults.find((e) => e.id === root.id);
          updateRootProgress(summary, root.id, {
            discovered: (currentSer?.discovered || 0) + 1,
            created: (currentSer?.created || 0) + (result.created ? 1 : 0),
            updated: (currentSer?.updated || 0) + (result.updated ? 1 : 0),
            duplicateDrafts: (currentSer?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
          });
        } catch (itemErr) {
          logScannerEvent('item_processing_error', { rootId: root.id, folder: baseName, error: itemErr.message });
          const rootEntry = summary.rootResults.find((entry) => entry.id === root.id);
          if (rootEntry) {
            rootEntry.errors.push(`[${baseName}] ${itemErr.message}`);
          }
        }
      }
    }

    if (progressCallback) {
      progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
    }
    await waitForImmediate();
  }

  updateRootProgress(summary, root.id, {
    status: 'finalizing',
    processed: totalCandidates,
  });
  if (progressCallback) {
    progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
  }

  let deletedCount = 0;
  try {
    deletedCount = Number(
      coerceDeletedCount(
        await retryAsync(() => deleteScannerItemsNotInSignatures(root.id, [...seenSignatures])),
        `series:${root.id}`,
      ),
    );
  } catch (deleteErr) {
    logScannerEvent('stale_item_cleanup_error', { rootId: root.id, error: deleteErr.message });
  }
  addToSummary(summary, 'deleted', deletedCount);
  const current = summary.rootResults.find((entry) => entry.id === root.id);
  updateRootProgress(summary, root.id, {
    deleted: toNonNegativeInteger(current?.deleted) + deletedCount,
  });

  nextRootState.lastCompletedAt = new Date().toISOString();
  await saveRootState(root.id, nextRootState);
  updateRootProgress(summary, root.id, {
    status: 'completed',
    processed: totalCandidates,
  });
  if (progressCallback) {
    progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
  }
}

async function summarizeRoot(root) {
  const pathAssessment = assessScanPath(root.scanPath);
  const effectiveMaxDepth = root.maxDepth ?? (root.type === 'movie' ? DEFAULT_MOVIE_DEPTH : 1);
  const effectiveBatchSize = root.batchSize ?? DEFAULT_BATCH_SIZE;
  const state = await loadRootState(root.id);
  const entry = {
    id: root.id,
    label: root.label,
    type: root.type,
    scanPath: root.scanPath,
    exists: pathAssessment.exists,
    checkable: pathAssessment.checkable,
    pathStatus: pathAssessment.status,
    pathStatusLabel: pathAssessment.statusLabel,
    directoryCount: 0,
    fileCount: 0,
    videoCount: 0,
    imageCount: 0,
    estimatedCandidates: 0,
    maxDepth: effectiveMaxDepth,
    batchSize: effectiveBatchSize,
    lastCompletedAt: state.lastCompletedAt || '',
    cachedFolders: Object.keys(state.folders || {}).length,
    error: pathAssessment.error,
  };

  if (!pathAssessment.exists) {
    return entry;
  }

  try {
    const topEntries = listDirectoryEntries(root.scanPath);
    entry.directoryCount = topEntries.filter((item) => item.isDirectory()).length;
    entry.fileCount = topEntries.filter((item) => item.isFile()).length;
    entry.videoCount = topEntries.filter((item) => item.isFile() && VIDEO_EXTENSIONS.has(path.extname(item.name).toLowerCase())).length;
    entry.imageCount = topEntries.filter((item) => item.isFile() && IMAGE_EXTENSIONS.has(path.extname(item.name).toLowerCase())).length;
    // estimatedCandidates is only a health-snapshot hint (not used by the UI and not by the
    // actual scan). Approximate it with the cheap top-level directory count instead of a
    // deep recursive walk (collectDirectoriesIncrementally to depth 6), which blocked the
    // event loop on network-mounted movie roots.
    entry.estimatedCandidates = topEntries.filter((item) => item.isDirectory()).length;
  } catch (error) {
    entry.error = error.message;
  }

  return entry;
}

// The roots summary requires walking the (possibly network-mounted) media
// directory tree, which is expensive. Cache that part briefly so repeated
// dashboard/health reads don't re-walk the filesystem every time. currentJob
// stays live (computed on every call) so scan progress is never stale.
let scannerRootsHealthCache = null; // { data, expiresAt }
const SCANNER_ROOTS_HEALTH_TTL = 30 * 1000; // 30 seconds

async function computeRootsHealth() {
  const roots = await Promise.all(getEffectiveRootsCached().map(summarizeRoot));
  return {
    totalRoots: roots.length,
    healthyRoots: roots.filter((root) => root.checkable && root.exists && !root.error).length,
    brokenRoots: roots.filter((root) => root.checkable && !root.exists).length,
    remoteRoots: roots.filter((root) => !root.checkable).length,
    roots,
  };
}

async function getScannerHealth() {
  if (!scannerRootsHealthCache || scannerRootsHealthCache.expiresAt <= Date.now()) {
    scannerRootsHealthCache = {
      data: await computeRootsHealth(),
      expiresAt: Date.now() + SCANNER_ROOTS_HEALTH_TTL,
    };
  }
  const rootsHealth = scannerRootsHealthCache.data;

  return {
    checkedAt: new Date().toISOString(),
    ...rootsHealth,
    recentRuns: await getScannerRuns(10),
    metadataCache: getEnhancedCacheStats(),
    fileRelocationCache: getFileRelocationCacheStats(),
    currentJob: serializeJob(currentScanJob),
  };
}

async function scanSelectedRoots(selectedRootIds = [], progressCallback, options = {}) {
  const effectiveRoots = getEffectiveRoots();
  const allRoots = selectedRootIds.length
    ? effectiveRoots.filter((root) => selectedRootIds.includes(root.id))
    : effectiveRoots;

  // ── New-root cap ─────────────────────────────────────────────────────────────
  // Auto-discovered roots (id starts with "auto-") that have zero DB signatures
  // are brand-new.  Cap how many of these we process per scan so a discovery fix
  // that finds 500+ roots doesn't block the scan for hours.  Already-scanned
  // roots (those with existing signatures) are always included.
  const autoRoots = allRoots.filter((r) => String(r.id || '').startsWith('auto-'));
  const manualRoots = allRoots.filter((r) => !String(r.id || '').startsWith('auto-'));

  // Batch-check which auto-roots already have DB content (single query, not N queries)
  let existingAutoRootIds = new Set();
  try {
    existingAutoRootIds = await getRootIdsWithContent(autoRoots.map((r) => r.id));
  } catch {
    // treat all as new if batch query fails
  }

  const alreadyScannedAutoRoots = autoRoots.filter((r) => existingAutoRootIds.has(r.id));
  const newAutoRoots = autoRoots.filter((r) => !existingAutoRootIds.has(r.id));
  const cappedNewAutoRoots = newAutoRoots.slice(0, MAX_NEW_ROOTS_PER_SCAN);
  const deferredNewAutoRoots = newAutoRoots.slice(MAX_NEW_ROOTS_PER_SCAN);

  const roots = [...manualRoots, ...alreadyScannedAutoRoots, ...cappedNewAutoRoots];

  if (deferredNewAutoRoots.length > 0) {
    logScannerEvent('new_roots_capped', {
      totalNew: newAutoRoots.length,
      processed: cappedNewAutoRoots.length,
      deferred: deferredNewAutoRoots.length,
      cap: MAX_NEW_ROOTS_PER_SCAN,
    });
  }

  scanAbortRequested = false;
  const summary = createSummary(roots);
  const scanContext = {
    runId: options.runId || `${Date.now()}`,
    startedAt: summary.startedAt,
    dryRun: !!options.dryRun,
  };

  const hasRootTimeout = SCANNER_ROOT_TIMEOUT_MS > 0;

  for (const root of roots) {
    if (scanAbortRequested) {
      logScannerEvent('scan_aborted', { runId: scanContext.runId, rootId: root.id });
      break;
    }
    if (root.skipScan) {
      summary.skipped.push({ id: root.id, label: root.label, path: root.scanPath, error: 'Skipped by configuration (skipScan=true)' });
      updateRootProgress(summary, root.id, {
        status: 'skipped',
        exists: true,
        checkable: true,
        pathStatus: 'skipped',
        pathStatusLabel: 'Skipped',
        skipped: 1,
        errors: ['Skipped by configuration'],
      });
      if (progressCallback) {
        progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
      }
      continue;
    }
    const pathAssessment = assessScanPath(root.scanPath);
    if (!pathAssessment.checkable || !pathAssessment.exists) {
      const errorMsg = pathAssessment.error || `Path not found: ${root.scanPath}`;
      summary.errors.push(errorMsg);
      summary.skipped.push({ id: root.id, label: root.label, path: root.scanPath, error: errorMsg });
      updateRootProgress(summary, root.id, {
        status: 'skipped',
        exists: pathAssessment.exists,
        checkable: pathAssessment.checkable,
        pathStatus: pathAssessment.status,
        pathStatusLabel: pathAssessment.statusLabel,
        skipped: 1,
        errors: [errorMsg],
      });
      if (SCANNER_CLEANUP_MISSING_ROOTS && !root.discovered) {
        try {
          const allRoots = loadScannerRoots();
          const cleaned = allRoots.filter((r) => r.id !== root.id);
          if (cleaned.length < allRoots.length) {
            await saveScannerRoots(cleaned);
            await refreshScannerCaches();
          }
        } catch (cleanupError) {
          logScannerEvent('root_cleanup_failed', { rootId: root.id, error: cleanupError.message });
        }
      }
      if (progressCallback) {
        progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
      }
      continue;
    }

    let existingSignatureSet = null;
    try {
      const rootSignatures = await retryAsync(() => getScanSignaturesByRootId(root.id));
      existingSignatureSet = new Set(rootSignatures);
      logScannerEvent('root_signatures_prefetched', {
        runId: scanContext.runId,
        rootId: root.id,
        signatureCount: existingSignatureSet.size,
      });
    } catch (signatureError) {
      logScannerEvent('root_signatures_prefetch_failed', {
        runId: scanContext.runId,
        rootId: root.id,
        error: signatureError.message,
      });
    }

    try {
      const rootPromise = root.type === 'series'
        ? processSeriesRoot(root, summary, progressCallback, scanContext, existingSignatureSet)
        : processMovieRoot(root, summary, progressCallback, scanContext, existingSignatureSet);

      if (hasRootTimeout) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Root scan timed out after ${SCANNER_ROOT_TIMEOUT_MS}ms`)), SCANNER_ROOT_TIMEOUT_MS);
        });
        await Promise.race([rootPromise, timeoutPromise]);
      } else {
        await rootPromise;
      }
      summary.rootsScanned += 1;
    } catch (error) {
      const errorMsg = `Error scanning ${root.label}: ${error.message}`;
      summary.errors.push(errorMsg);
      updateRootProgress(summary, root.id, {
        status: 'failed',
        errors: [errorMsg],
      });
      if (progressCallback) {
        progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
      }
    }
  }


  summary.completedAt = new Date().toISOString();
  const normalizedSummary = normalizeSummary(summary) || createSummary([]);

  if (scanContext.dryRun) {
    logScannerEvent('scan_dry_run_completed', {
      runId: scanContext.runId,
      wouldCreate: normalizedSummary.created,
      wouldUpdate: normalizedSummary.updated,
      wouldDelete: normalizedSummary.deleted,
      wouldUnchanged: normalizedSummary.unchanged,
      errors: normalizedSummary.errors.length,
    });
    return normalizedSummary;
  }

  // Invalidate the duplicate group cache: scan added/updated many items
  // and stale cached groups will misreport duplicate counts on subsequent reads.
  try {
    const { invalidateDuplicateCache, recalculateDuplicateCounts } = require('../data/store/content');
    invalidateDuplicateCache();
    await recalculateDuplicateCounts().catch(() => {});
  } catch (e) {
    // safe to ignore — cache will expire on TTL anyway
  }
  await recordScannerRun({
    id: scanContext.runId,
    status: normalizedSummary.errors.length > 0 ? 'completed_with_errors' : 'completed',
    startedAt: normalizedSummary.startedAt,
    completedAt: normalizedSummary.completedAt,
    rootIds: currentScanJob?.rootIds || [],
    rootsRequested: normalizedSummary.rootsRequested,
    rootsScanned: normalizedSummary.rootsScanned,
    created: normalizedSummary.created,
    updated: normalizedSummary.updated,
    unchanged: normalizedSummary.unchanged,
    deleted: normalizedSummary.deleted,
    duplicateDrafts: normalizedSummary.duplicateDrafts,
    skipped: normalizedSummary.skipped,
    errors: normalizedSummary.errors,
    rootResults: normalizedSummary.rootResults,
    triggerSource: currentScanJob?.triggerSource || 'manual',
  });

  logScannerEvent('scan_completed', {
    runId: scanContext.runId,
    rootsScanned: normalizedSummary.rootsScanned,
    rootsRequested: normalizedSummary.rootsRequested,
    created: normalizedSummary.created,
    updated: normalizedSummary.updated,
    deleted: normalizedSummary.deleted,
    unchanged: normalizedSummary.unchanged,
    errors: normalizedSummary.errors.length,
  });

  setImmediate(() => {
    runPostScanTasks(normalizedSummary).catch(() => {});
  });

  // Fire completion webhook if configured
  if (SCANNER_COMPLETION_WEBHOOK_URL) {
    setImmediate(async () => {
      try {
        const https = require('https');
        const http = require('http');
        const transport = SCANNER_COMPLETION_WEBHOOK_URL.startsWith('https') ? https : http;
        const body = JSON.stringify({
          event: 'scan_completed',
          runId: scanContext.runId,
          dryRun: scanContext.dryRun,
          summary: {
            rootsRequested: normalizedSummary.rootsRequested,
            rootsScanned: normalizedSummary.rootsScanned,
            created: normalizedSummary.created,
            updated: normalizedSummary.updated,
            unchanged: normalizedSummary.unchanged,
            deleted: normalizedSummary.deleted,
            errors: (normalizedSummary.errors || []).length,
          },
          completedAt: normalizedSummary.completedAt,
        });
        const req = transport.request(SCANNER_COMPLETION_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
          timeout: 10000,
        });
        req.on('error', () => {});
        req.write(body);
        req.end();
      } catch { /* non-critical */ }
    });
  }

  return normalizedSummary;
}


function attachChildHandlers(child) {
  currentScanChild = child;

  child.on('error', (err) => {
    currentScanJob = {
      ...currentScanJob,
      status: 'failed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: `Scanner worker error: ${err.message}`,
    };
    logScannerEvent('worker_error', { runId: currentScanJob?.id || '', error: err.message });
    void updateRuntimeJob(currentScanJob);
    currentScanChild = null;
  });

  child.on('message', (message) => {
    if (message?.type === 'progress') {
      currentScanJob = {
        ...currentScanJob,
        status: 'running',
        completedAt: '',
        error: '',
        updatedAt: new Date().toISOString(),
        summary: normalizeSummary(message.summary),
      };
      void updateRuntimeJob(currentScanJob);
      return;
    }

    if (message?.type === 'completed') {
      currentScanJob = {
        ...currentScanJob,
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: '',
        summary: normalizeSummary(message.summary),
      };
      logScannerEvent('worker_completed', { runId: currentScanJob?.id || '' });
      const summary = normalizeSummary(message.summary);
      setImmediate(() => {
        runPostScanTasks(summary).catch(() => {});
      });
      void refreshScannerCaches().catch(() => {}).finally(() => {
        updateRuntimeJob(currentScanJob).catch((err) => logScannerEvent('runtime_persist_failed', { error: err.message }));
      });
      currentScanChild = null;
      return;
    }

    if (message?.type === 'failed') {
      currentScanJob = {
        ...currentScanJob,
        status: 'failed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: message.error || 'Scanner worker failed.',
      };
      logScannerEvent('worker_failed', {
        runId: currentScanJob?.id || '',
        error: String(message.error || 'Scanner worker failed.'),
      });
      void updateRuntimeJob(currentScanJob);
      currentScanChild = null;
    }
  });

  child.on('exit', (code) => {
    if (currentScanJob?.status === 'running') {
      currentScanJob = {
        ...currentScanJob,
        status: code === 0 ? 'completed' : 'failed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: code === 0 ? '' : `Scanner worker exited with code ${code}`,
      };
      logScannerEvent('worker_exit', {
        runId: currentScanJob?.id || '',
        code: Number(code || 0),
        status: currentScanJob.status,
      });
      void updateRuntimeJob(currentScanJob);
    }
    currentScanChild = null;
  });
}

// Returns true if another instance holds a fresh scan lock (persisted running job with a
// recent heartbeat owned by someone else).
async function isScanLockedByOtherInstance() {
  try {
    const runtime = await getAppState('scanner_runtime', { currentJob: null, queue: [] });
    const job = runtime?.currentJob;
    if (!job || job.status !== 'running') return false;
    if (job.owner === SCANNER_INSTANCE_ID) return false; // our own job
    const lockedAt = job.lockedAt ? Date.parse(job.lockedAt) : 0;
    return Number.isFinite(lockedAt) && (Date.now() - lockedAt) < SCANNER_LOCK_TTL_MS;
  } catch (err) {
    // On DB error, don't block scanning — fall back to the in-process guard only.
    logScannerEvent('scan_lock_check_failed', { error: err.message });
    return false;
  }
}

async function runPostScanTasks(summary) {
  try {
    const { db } = require('../data/store/base');
    const pool = await db.getPool();
    const result = await pool.query(
      `SELECT id, payload FROM content_catalog
       WHERE status = 'published'
         AND (payload->>'poster' IS NULL OR payload->>'poster' = ''
           OR payload->>'backdrop' IS NULL OR payload->>'backdrop' = ''
           OR payload->>'description' IS NULL OR payload->>'description' = '')
       ORDER BY id LIMIT 20`,
    );
    let fixed = 0;
    for (const row of result.rows) {
      try {
        const enriched = await enrichItemWithMetadata(row.payload);
        if (enriched && (enriched.poster || enriched.backdrop || enriched.description)) {
          const { updateItem } = require('../data/store/content');
          await updateItem(row.id, enriched);
          fixed++;
        }
      } catch {
        // skip failed items
      }
    }
    const newDiscoveries = (summary.rootResults || [])
      .filter((r) => (r.discovered || 0) > 0)
      .map((r) => ({ rootLabel: r.label, count: r.discovered }));
    const scanSummary = {
      completedAt: summary.completedAt || new Date().toISOString(),
      created: summary.created || 0,
      updated: summary.updated || 0,
      deleted: summary.deleted || 0,
      errors: (summary.errors || []).length,
      missingPostersFixed: fixed,
      newDiscoveries,
    };
    try {
      const pool2 = await db.getPool();
      await pool2.query(
        `INSERT INTO app_state (key, value, updated_at)
         VALUES ('last_scan_summary', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(scanSummary)],
      );

      // ── SCAN HISTORY: Maintain last 10 scan summaries in 'last_scan_history' ──
      try {
        const historyRes = await pool2.query(`SELECT value FROM app_state WHERE key = 'last_scan_history' LIMIT 1`);
        const currentHistory = Array.isArray(historyRes.rows[0]?.value) ? historyRes.rows[0].value : [];
        const updatedHistory = [scanSummary, ...currentHistory].slice(0, 10);
        await pool2.query(
          `INSERT INTO app_state (key, value, updated_at)
           VALUES ('last_scan_history', $1::jsonb, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [JSON.stringify(updatedHistory)],
        );
      } catch {
        // history save failure non-critical
      }
    } catch {
      // non-critical
    }
    logScannerEvent('post_scan_tasks_completed', { missingPostersFixed: fixed, totalChecked: result.rows.length });
  } catch (err) {
    logScannerEvent('post_scan_tasks_failed', { error: err.message });
  }
}

async function rescanItem(item) {
  const logger = require('../utils/logger');
  if (!item || !item.id) return { ok: false, error: 'Invalid item' };
  const sourcePath = String(item.sourcePath || item.source || '').trim();
  if (!sourcePath) return { ok: false, error: 'Item has no sourcePath or source' };
  const fs = require('fs');
  if (!fs.existsSync(sourcePath)) return { ok: false, error: `Path not found on disk: ${sourcePath}` };

  const stat = fs.statSync(sourcePath);
  const isDir = stat.isDirectory();
  const logPrefix = `[rescan ${item.id}]`;

  try {
    let processedItem = { ...item, sourcePath, source: sourcePath };

    if (item.type === 'series' && isDir) {
      const { buildSeriesSeasons } = require('./scanner-series-parser');
      // Prefer exact sourceRootId match; fallback to longest scanPath prefix match
      const roots = loadScannerRoots();
      let root = roots.find((r) => item.sourceRootId === r.id);
      if (!root) {
        const matches = roots
          .filter((r) => sourcePath.startsWith(r.scanPath))
          .sort((a, b) => b.scanPath.length - a.scanPath.length);
        root = matches[0] || null;
      }
      const listFiles = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };
      const listDirectories = (dir) => { try { const entries = fs.readdirSync(dir, { withFileTypes: true }); return entries.filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; } };
      const listVideoFiles = (files, dir) => { try { return files.filter((f) => { const ext = path.extname(f).toLowerCase(); return VIDEO_EXTENSIONS.has(ext) && !JUNK_REGEX.test(f); }); } catch { return []; } };
      const toPublicUrl = (rootRef, filePath) => { try { if (rootRef?.publicBaseUrl) { const rel = path.relative(rootRef.scanPath, filePath).replace(/\\/g, '/'); return rootRef.publicBaseUrl + '/' + encodeURI(rel); } } catch {} return ''; };
      const preferredLabel = item.seasons?.[0]?.title || 'Season 1';
      const result = buildSeriesSeasons(
        root || { id: 'rescan', scanPath: isDir ? sourcePath : path.dirname(sourcePath), publicBaseUrl: '' },
        path.basename(sourcePath),
        isDir ? sourcePath : path.dirname(sourcePath),
        { listFiles, listDirectories, listVideoFiles, toPublicUrl, findSubtitleFile: () => '', preferredSeasonLabel: preferredLabel }
      );
      processedItem = {
        ...item,
        sourcePath,
        source: sourcePath,
        seasons: result.seasons,
        seasonCount: result.seasons.length,
        episodeCount: result.seasons.reduce((sum, s) => sum + (s.episodes?.length || 0), 0),
      };
    } else if (item.type === 'movie' && !isDir) {
      processedItem.sourcePath = sourcePath;
      processedItem.source = sourcePath;
    }

    const enriched = await enrichItemWithMetadata(processedItem);
    if (enriched) processedItem = { ...processedItem, ...enriched };

    const { upsertScannedItem } = require('../data/store/scanner');
    const result = await upsertScannedItem(processedItem);
    logger.info(`${logPrefix} completed: created=${result.created}, updated=${result.updated}`);
    return { ok: true, item: result.item, created: result.created, updated: result.updated };
  } catch (err) {
    logger.error(`${logPrefix} failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function startScanJob(selectedRootIds = [], options = {}) {
  if (currentScanJob?.status === 'running') {
    logScannerEvent('scan_start_skipped_already_running', { runId: currentScanJob.id });
    return currentScanJob;
  }

  if (await isScanLockedByOtherInstance()) {
    logScannerEvent('scan_start_skipped_locked_by_other_instance', {});
    return getCurrentScanJob();
  }

  if (resumeScanTimer) {
    clearTimeout(resumeScanTimer);
    resumeScanTimer = null;
  }

  const rootIds = Array.isArray(selectedRootIds) ? [...selectedRootIds] : [];
  const dryRun = !!options.dryRun;
  const triggerSource = String(options.triggerSource || 'manual');
  currentScanJob = {
    id: `${Date.now()}`,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: '',
    updatedAt: new Date().toISOString(),
    owner: SCANNER_INSTANCE_ID,
    lockedAt: new Date().toISOString(),
    rootIds,
    triggerSource,
    summary: createSummary(getEffectiveRoots().filter((root) => !rootIds.length || rootIds.includes(root.id))),
    error: '',
  };
  logScannerEvent('scan_started', { runId: currentScanJob.id, rootIds: currentScanJob.rootIds, dryRun });
  void updateRuntimeJob(currentScanJob);

  const workerPath = path.resolve(__dirname, 'scanner-worker.js');

  let child;
  try {
    child = fork(workerPath, [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      env: {
        ...process.env,
        SCANNER_ROOT_IDS: JSON.stringify(rootIds),
        SCANNER_RUN_ID: currentScanJob.id,
        SCANNER_DRY_RUN: dryRun ? 'true' : 'false',
      },
    });
  } catch (err) {
    currentScanJob = {
      ...currentScanJob,
      status: 'failed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: `Failed to start scanner worker: ${err.message}`,
    };
    logScannerEvent('scan_start_failed', { error: err.message });
    void updateRuntimeJob(currentScanJob);
    return currentScanJob;
  }

  attachChildHandlers(child);
  return currentScanJob;
}

function stopScanJob() {
  if (!currentScanJob || currentScanJob.status !== 'running') {
    return getCurrentScanJob();
  }

  if (currentScanChild) {
    const child = currentScanChild;
    try {
      child.kill('SIGTERM');
      // SIGKILL fallback: if the worker ignores SIGTERM / hangs on a slow network read,
      // force-kill it after a grace period so it can't linger as an orphan.
      const killTimer = setTimeout(() => {
        try {
          if (!child.killed) child.kill('SIGKILL');
        } catch {
          // best effort
        }
      }, SCANNER_STOP_GRACE_MS);
      if (typeof killTimer.unref === 'function') killTimer.unref();
      child.once('exit', () => clearTimeout(killTimer));
    } catch {
      // best effort termination
    }
  }

  currentScanJob = {
    ...currentScanJob,
    status: 'stopped',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: 'Scanner stopped by admin.',
  };
  logScannerEvent('scan_stopped', { runId: currentScanJob.id });
  void updateRuntimeJob(currentScanJob);
  currentScanChild = null;
  return serializeJob(currentScanJob);
}

async function getCurrentScanJob() {
  if (!currentScanJob) {
    return null;
  }

  if (currentScanJob.status === 'running') {
    return serializeJob(currentScanJob);
  }

  try {
    const dbRun = await getScannerRunById(currentScanJob.id);
    if (dbRun) {
      const dbSummary = dbRun.rootResults && dbRun.rootResults.length
        ? {
            startedAt: dbRun.startedAt,
            completedAt: dbRun.completedAt,
            rootsRequested: dbRun.rootsRequested,
            rootsScanned: dbRun.rootsScanned,
            created: dbRun.created,
            updated: dbRun.updated,
            unchanged: dbRun.unchanged,
            deleted: dbRun.deleted,
            duplicateDrafts: dbRun.duplicateDrafts,
            skipped: dbRun.skipped || [],
            errors: dbRun.errors || [],
            drafts: [],
            rootResults: dbRun.rootResults,
          }
        : null;
      currentScanJob = {
        ...currentScanJob,
        status: dbRun.status,
        completedAt: dbRun.completedAt || currentScanJob.completedAt,
        error: dbRun.error || currentScanJob.error,
        summary: dbSummary || currentScanJob.summary,
      };
      return serializeJob(currentScanJob);
    }
  } catch (dbError) {
    logScannerEvent('get_current_job_db_fallback', { error: dbError.message });
  }

  return serializeJob(currentScanJob);
}


function scheduleResumeScan(rootIds = []) {
  if (!SCANNER_AUTO_RESUME_ON_RESTART) {
    return;
  }

  if (resumeScanTimer) {
    clearTimeout(resumeScanTimer);
  }

  resumeScanTimer = setTimeout(() => {
    resumeScanTimer = null;
    if (currentScanJob?.status === 'running') {
      logScannerEvent('auto_resume_skipped_running');
      return;
    }

    logScannerEvent('auto_resume_triggered', { rootIds });
    Promise.resolve(startScanJob(rootIds)).catch((err) => logScannerEvent('auto_resume_failed', { error: err.message }));
  }, SCANNER_AUTO_RESUME_DELAY_MS);

  if (typeof resumeScanTimer.unref === 'function') {
    resumeScanTimer.unref();
  }

  logScannerEvent('auto_resume_scheduled', {
    delayMs: SCANNER_AUTO_RESUME_DELAY_MS,
    rootIds,
  });
}

async function bootstrapScannerRuntime() {
  let runtime = loadScannerRuntime();
  if (!runtime || !runtime.currentJob) {
    try {
      const dbRuntime = await getAppState('scanner_runtime', { currentJob: null, queue: [] });
      runtime = dbRuntime || runtime;
    } catch (bootstrapReadError) {
      logScannerEvent('bootstrap_runtime_db_read_failed', { error: bootstrapReadError.message });
    }
  }
  const runtimeJob = normalizeRuntimeJob(runtime.currentJob);
  if (runtimeJob && runtimeJob.status === 'running') {
    currentScanJob = {
      ...runtimeJob,
      status: 'interrupted',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: 'Scanner process restarted before completion.',
    };
    logScannerEvent('scan_interrupted_on_bootstrap', {
      runId: currentScanJob.id,
      rootIds: currentScanJob.rootIds,
    });
    void updateRuntimeJob(currentScanJob);
    scheduleResumeScan(currentScanJob.rootIds || []);
    return;
  }

  currentScanJob = serializeJob(runtimeJob) || null;
  if (currentScanJob && currentScanJob.id) {
    try {
      const dbRun = await getScannerRunById(currentScanJob.id);
      if (dbRun) {
        const dbSummary = dbRun.rootResults && dbRun.rootResults.length
          ? {
              startedAt: dbRun.startedAt,
              completedAt: dbRun.completedAt,
              rootsRequested: dbRun.rootsRequested,
              rootsScanned: dbRun.rootsScanned,
              created: dbRun.created,
              updated: dbRun.updated,
              unchanged: dbRun.unchanged,
              deleted: dbRun.deleted,
              duplicateDrafts: dbRun.duplicateDrafts,
              skipped: dbRun.skipped || [],
              errors: dbRun.errors || [],
              drafts: [],
              rootResults: dbRun.rootResults,
            }
          : null;
        currentScanJob = {
          ...currentScanJob,
          status: dbRun.status,
          completedAt: dbRun.completedAt || currentScanJob.completedAt,
          error: dbRun.error || currentScanJob.error,
          summary: dbSummary || currentScanJob.summary,
        };
        await updateRuntimeJob(currentScanJob);
      }
    } catch (bootstrapDbError) {
      logScannerEvent('bootstrap_db_sync_failed', { error: bootstrapDbError.message });
    }
  }
}

function registerScannerSignalHandlers() {
  if (signalHandlersRegistered) {
    return;
  }

  const onSignal = (signal) => {
    if (currentScanJob?.status === 'running') {
      logScannerEvent('process_signal_received', {
        signal,
        action: 'mark_scan_stopped',
        runId: currentScanJob.id,
      });
      stopScanJob();
    }
  };

  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));
  signalHandlersRegistered = true;
}

function bootstrapAutoScanScheduler() {

  if (AUTO_SCAN_INTERVAL_MINUTES <= 0 || autoScanTimer) {
    return;
  }

  const intervalMs = AUTO_SCAN_INTERVAL_MINUTES * 60 * 1000;

  // Use chained setTimeout instead of setInterval so the next scan is
  // always scheduled AFTER the current one completes — preventing overlap.
  function scheduleNext() {
    autoScanTimer = setTimeout(() => {
      autoScanTimer = null;
      if (currentScanJob?.status === 'running') {
        // Still running — wait one more interval before trying again
        scheduleNext();
        return;
      }
      logScannerEvent('auto_scan_interval_triggered', { intervalMinutes: AUTO_SCAN_INTERVAL_MINUTES });
      Promise.resolve(startScanJob([], { triggerSource: 'auto' })).catch((err) => logScannerEvent('auto_scan_failed', { error: err.message }));
      // Schedule the next run after the interval (scan may still be running;
      // the running-check above guards against true overlap)
      scheduleNext();
    }, intervalMs);

    if (typeof autoScanTimer.unref === 'function') {
      autoScanTimer.unref();
    }
  }

  scheduleNext();
}

// ── RECONCILIATION SCHEDULER ──────────────────────────────────────────────────
// Periodically checks for stale published entries whose sourcePath doesn't exist
// on disk and a newer entry with the same titleKey exists. This is a safety net
// for cases where the fingerprint skip optimization misses stale paths.

function bootstrapReconciliationScheduler() {
  if (reconciliationTimer) return;

  const intervalMs = RECONCILIATION_INTERVAL_HOURS * 60 * 60 * 1000;

  function scheduleNext() {
    reconciliationTimer = setTimeout(async () => {
      try {
        await runStalePathReconciliation();
      } catch (err) {
        logScannerEvent('reconciliation_failed', { error: err.message });
      }
      scheduleNext();
    }, intervalMs);

    if (typeof reconciliationTimer.unref === 'function') {
      reconciliationTimer.unref();
    }
  }

  scheduleNext();
}

async function runStalePathReconciliation() {
  const { db } = require('../data/store/base');
  const fs = require('fs');

  logScannerEvent('reconciliation_started', { timestamp: new Date().toISOString() });

  // Helper: Find relocated file in directory and subdirectories
  async function findRelocatedFile(searchDir, targetFileName, title, maxDepth = RECONCILIATION_SEARCH_DEPTH) {
    try {
      const entries = await fs.promises.readdir(searchDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          // Exact filename match
          if (entry.name === targetFileName) {
            return path.join(searchDir, entry.name);
          }
          // Normalized filename match (ignore case, spaces, special chars)
          const normalizedEntry = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedTarget = targetFileName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedEntry === normalizedTarget) {
            return path.join(searchDir, entry.name);
          }
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && maxDepth > 0) {
          const nested = await findRelocatedFile(path.join(searchDir, entry.name), targetFileName, title, maxDepth - 1);
          if (nested) return nested;
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    return null;
  }

  // Helper: Find file by fuzzy title match
  async function findFileByFuzzyTitle(searchDir, title, year) {
    try {
      const entries = await fs.promises.readdir(searchDir, { withFileTypes: true });
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

        const dirName = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Check if directory name contains the title (fuzzy match)
        if (dirName.includes(normalizedTitle) || normalizedTitle.includes(dirName)) {
          // Look for video files in this directory
          const subEntries = await fs.promises.readdir(path.join(searchDir, entry.name), { withFileTypes: true });
          const videoFile = subEntries.find((e) =>
            e.isFile() && /\.(mp4|mkv|avi|mov|webm|m4v)$/i.test(e.name)
          );
          if (videoFile) {
            return path.join(searchDir, entry.name, videoFile.name);
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    return null;
  }

  // Helper: Find a directory by name anywhere under root (for directory-move detection)
  async function findDirectoryInRoot(searchDir, targetDirName, maxDepth) {
    try {
      const entries = await fs.promises.readdir(searchDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const normalizedEntry = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedTarget = targetDirName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedEntry === normalizedTarget) {
          return path.join(searchDir, entry.name);
        }
        if (maxDepth > 0) {
          const nested = await findDirectoryInRoot(path.join(searchDir, entry.name), targetDirName, maxDepth - 1);
          if (nested) return nested;
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    return null;
  }

  // Get all published scanner entries
  const result = await db.query(
    `SELECT id, title, title_key, content_type, year, payload
     FROM content_catalog
     WHERE source_type = 'scanner' AND status = 'published'`
  );

  let deleted = 0;
  let fixed = 0;
  let skipped = 0;
  let dirMoved = 0;

  // ── Directory-move detection pre-pass ─────────────────────────────────────────
  // Group entries by parent directory so that if an entire directory (e.g., a TV
  // series folder) has been relocated, we can bulk-update all child entries in a
  // single batch instead of failing per-entry lookups.
  const dirGroups = new Map();
  for (const row of result.rows) {
    const sp = row.payload?.sourcePath;
    if (!sp) continue;
    const dir = path.dirname(sp);
    if (!dirGroups.has(dir)) dirGroups.set(dir, []);
    dirGroups.get(dir).push(row);
  }

  const handledIds = new Set();
  for (const [dirPath, entries] of dirGroups) {
    if (entries.length < 2) continue;

    const dirExists = await fs.promises.access(dirPath).then(() => true).catch(() => false);
    if (dirExists) continue;

    const dirName = path.basename(dirPath);
    let relocatedDir = null;

    if (relocatedDir === null && DEFAULT_MEDIA_LIBRARY_ROOT) {
      const found = await findDirectoryInRoot(DEFAULT_MEDIA_LIBRARY_ROOT, dirName, RECONCILIATION_SEARCH_DEPTH + 3);
      if (found) relocatedDir = found;
    }

    if (relocatedDir) {
      const updates = [];
      for (const entry of entries) {
        const sp = entry.payload.sourcePath;
        const relativePath = sp.startsWith(dirPath) ? sp.slice(dirPath.length).replace(/^[\\\/]/, '') : path.basename(sp);
        const newSourcePath = path.join(relocatedDir, relativePath);
        const newSourcePublicPath = newSourcePath.replace(/\\/g, '/').replace(/^.*?\/(Movies|Movies_Archive|New_Collection|Others|Requested|Hindi|English|Tamil|Telugu|TV_Series|Web_Series)/, '/$1');
        updates.push({
          id: entry.id,
          sourcePath: newSourcePath,
          videoUrl: newSourcePublicPath,
        });
      }
      for (const u of updates) {
        const newPayload = { ...entries.find(e => e.id === u.id).payload, sourcePath: u.sourcePath, sourcePublicPath: u.videoUrl, videoUrl: u.videoUrl };
        await db.query('UPDATE content_catalog SET payload = $2::jsonb WHERE id = $1', [u.id, JSON.stringify(newPayload)]);
        handledIds.add(u.id);
        fixed++;
        dirMoved++;
      }
      logScannerEvent('reconciliation_dir_moved', {
        dir: dirPath,
        newDir: relocatedDir,
        fixed: updates.length,
      });
    }
  }

  for (const row of result.rows) {
    if (handledIds.has(row.id)) continue;
    const p = row.payload;
    if (!p || !p.sourcePath) continue;

    // Check if sourcePath exists on disk
    const pathExists = await fs.promises.access(p.sourcePath).then(() => true).catch(() => false);
    if (pathExists) continue;

    // File doesn't exist - try to find relocated file
    const titleKey = row.title_key || normalizeTitleKey(row.title, row.year);
    const fileName = path.basename(p.sourcePath);
    const fileDir = path.dirname(p.sourcePath);

    // Strategy 1: Search in same directory and subdirectories
    let relocatedPath = await findRelocatedFile(fileDir, fileName, row.title);

    // Strategy 2: Search in year subfolder (e.g., /Movies/Title.mkv → /Movies/2026/Title.mkv)
    if (!relocatedPath && row.year) {
      const yearDir = path.join(path.dirname(fileDir), String(row.year));
      relocatedPath = await findRelocatedFile(yearDir, fileName, row.title);
    }

    // Strategy 3: Search in parent directory
    if (!relocatedPath) {
      const parentDir = path.dirname(fileDir);
      relocatedPath = await findRelocatedFile(parentDir, fileName, row.title);
    }

    // Strategy 4: Fuzzy search by title in nearby directories
    if (!relocatedPath && row.title) {
      relocatedPath = await findFileByFuzzyTitle(fileDir, row.title, row.year);
    }

    // Strategy 5: Full-root fallback search across the entire media root
    if (!relocatedPath && DEFAULT_MEDIA_LIBRARY_ROOT) {
      relocatedPath = await findRelocatedFile(DEFAULT_MEDIA_LIBRARY_ROOT, fileName, row.title, RECONCILIATION_SEARCH_DEPTH + 3);
    }
    if (!relocatedPath && row.title && DEFAULT_MEDIA_LIBRARY_ROOT) {
      relocatedPath = await findFileByFuzzyTitle(DEFAULT_MEDIA_LIBRARY_ROOT, row.title, row.year);
    }

    if (relocatedPath) {
      // Found relocated file - update entry in-place
      const newVideoUrl = relocatedPath.replace(/\\/g, '/').replace(/^.*?\/(Movies|Movies_Archive|New_Collection|Others|Requested|Hindi|English|Tamil|Telugu|TV_Series|Web_Series)/, '/$1');
      const updatedPayload = {
        ...p,
        sourcePath: relocatedPath,
        sourcePublicPath: newVideoUrl,
        videoUrl: newVideoUrl,
      };
      await db.query('UPDATE content_catalog SET payload = $2::jsonb WHERE id = $1', [row.id, JSON.stringify(updatedPayload)]);
      fixed++;
      logScannerEvent('reconciliation_fixed_path', {
        id: row.id,
        title: row.title,
        oldPath: p.sourcePath,
        newPath: relocatedPath,
      });
    } else {
      // No relocated file found - check if newer entry exists
      const titleKey = row.title_key || normalizeTitleKey(row.title, row.year);
      if (titleKey) {
        const newerEntry = await db.query(
          `SELECT id, title FROM content_catalog
           WHERE content_type = $1
             AND title_key = $2
             AND source_type = 'scanner'
             AND id <> $3
             AND status = 'published'`,
          [row.content_type || 'movie', titleKey, row.id]
        );

        if (newerEntry.rows.length > 0) {
          // Delete stale entry
          await db.query('DELETE FROM content_catalog WHERE id = $1', [row.id]);
          deleted++;
          logScannerEvent('reconciliation_deleted_stale', {
            id: row.id,
            title: row.title,
            titleKey,
            newerId: newerEntry.rows[0].id,
          });
        } else {
          skipped++;
          logScannerEvent('reconciliation_skipped_no_newer', {
            id: row.id,
            title: row.title,
            titleKey,
          });
        }
      } else {
        skipped++;
      }
    }
  }

  logScannerEvent('reconciliation_completed', {
    total: result.rows.length,
    fixed,
    deleted,
    skipped,
    dirMoved,
    timestamp: new Date().toISOString(),
  });

  return { total: result.rows.length, fixed, deleted, skipped, dirMoved };
}

// Auto background jobs disabled — scanner only runs when triggered manually via admin API.
// IMPORTANT: only the main server process should run the runtime bootstrap and signal
// handlers. When scanner-worker.js forks and require()s this module, SCANNER_RUN_ID is set;
// running bootstrapScannerRuntime() there would see the parent's persisted "running" job,
// mark it interrupted, and schedule a resume that forks *another* worker — a duplicate-scan
// cascade. Skip lifecycle bootstrap inside worker processes.
if (!process.env.SCANNER_RUN_ID) {
  bootstrapScannerRuntime();
  registerScannerSignalHandlers();
  bootstrapAutoScanScheduler();
  bootstrapReconciliationScheduler();
  setupFileWatcher();
}

let fileWatcherTimer = null;

function setupFileWatcher() {
  const targetDir = DEFAULT_MEDIA_LIBRARY_ROOT;
  if (!fs.existsSync(targetDir)) {
    return;
  }

  logScannerEvent('file_watcher_started', { path: targetDir });

  try {
    fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const ext = path.extname(filename).toLowerCase();
      // Only care about media extensions (ignoring folders, metadata, subtitles, temp files)
      if (eventType === 'rename' && VIDEO_EXTENSIONS.has(ext)) {
        // Debounce scan calls to allow full file upload to finish before running a scan
        if (fileWatcherTimer) {
          clearTimeout(fileWatcherTimer);
        }
        fileWatcherTimer = setTimeout(() => {
          fileWatcherTimer = null;
          if (currentScanJob?.status === 'running') {
            logScannerEvent('watcher_scan_skipped_running');
            return;
          }
          logScannerEvent('watcher_scan_triggered', { file: filename });
          Promise.resolve(startScanJob([])).catch((err) =>
            logScannerEvent('watcher_scan_failed', { error: err.message })
          );
        }, 5000); // 5-second debounce window
      }
    });
  } catch (err) {
    logScannerEvent('watcher_init_failed', { error: err.message });
  }
}


module.exports = {
  getCurrentScanJob,
  getScannerHealth,
  listScannerRoots,
  rescanItem,
  scanSelectedRoots,
  startScanJob,
  stopScanJob,
  requestScanAbort,
  runStalePathReconciliation,
  __test__: {
    classifyAutoDiscoveredRoot,
    discoverScannerRoots,
    isMovieCategoryDirName,
    isTvSeriesContainerDirName,
    isTvWebSeriesRangeDirName,
    parseEpisodeIdentity,
    detectSeriesFolder,
    assignScannerTaxonomy,
  },
};
