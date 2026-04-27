const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const {
  deleteItemsByScanSignatures,
  deleteScannerItemsNotInSignatures,
  getItemByScanSignature,
  getScannerRuns,
  loadScannerRoots,
  loadScannerRuntime,
  loadScannerState,
  normalizeTitleKey,
  recordScannerRun,
  saveScannerRuntime,
  saveScannerState,
  upsertScannedItem,
} = require('../data/store');
const { enrichItemWithMetadata } = require('./metadata-enricher');
const {
  buildSeriesSeasons: buildSeriesSeasonsFromParser,
  cleanTitle,
  countEpisodeLikeFiles,
  hasSequentialEpisodePattern,
  looksLikeSeasonFolder,
  parseEpisodeIdentity,
  slugify,
} = require('./scanner-series-parser');

const VIDEO_EXTENSIONS = new Set(
  String(process.env.SCANNER_VIDEO_EXTENSIONS || '.mp4,.mkv,.avi,.mov,.wmv,.m4v,.webm,.ts,.m2ts,.mpg,.mpeg,.3gp,.flv,.vob')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIN_MOVIE_SIZE = Number(process.env.SCANNER_MIN_MOVIE_SIZE || 104857600); // 100MB
const MIN_EPISODE_SIZE = Number(process.env.SCANNER_MIN_EPISODE_SIZE || 31457280); // 30MB
const JUNK_REGEX = /sample|trailer|extras|promo|short|clip|preview|teaser/i;
const DUPLICATE_HOLD_DIR_NAME = process.env.MEDIA_NORMALIZER_DUPLICATE_DIR || '_duplicate_hold';
const PREFERRED_POSTER_PATTERNS = [
  /^(poster|cover|folder|front)$/i,
  /(poster|cover|folder|front)/i,
  /(backdrop|banner|fanart)/i,
];
const DEFAULT_MOVIE_DEPTH = Math.max(1, Number(process.env.SCANNER_DEFAULT_MOVIE_DEPTH || 6));
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_MEDIA_LIBRARY_ROOT = process.env.SCANNER_MEDIA_ROOT || '/var/www/html';
const ENABLE_AUTO_DISCOVER_ROOTS = process.env.SCANNER_AUTO_DISCOVER_ROOTS !== 'false';
const AUTO_DISCOVER_MAX_DEPTH = Math.max(1, Number(process.env.SCANNER_AUTO_DISCOVER_MAX_DEPTH || 3));
const AUTO_SCAN_INTERVAL_MINUTES = Math.max(0, Number(process.env.SCANNER_AUTO_SCAN_INTERVAL_MINUTES || 0));
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
];

let currentScanJob = null;
let currentScanChild = null;
let autoScanTimer = null;

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
  return `${root.publicBaseUrl}/${relativePath.split('/').map(encodeURIComponent).join('/')}`.replace(/%2520/g, '%20');
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
    preferredSeasonLabel,
  });
}

function detectSeriesFolder(root, folderPath, files = [], nestedDirectories = []) {
  if (root.type === 'series') {
    return true;
  }

  const directVideoFiles = listVideoFiles(files, folderPath, 'series');
  const directEpisodeLikeCount = countEpisodeLikeFiles(files);
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
      return countEpisodeLikeFiles(seasonFiles) >= 1
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

function listDirectoryEntries(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.name !== DUPLICATE_HOLD_DIR_NAME)
      .filter((entry) => !/\.normalizing\.\d+\.[a-f0-9]+$/i.test(entry.name))
      .filter((entry) => !/\.pre-normalize\.\d+(?:\.bak)?$/i.test(entry.name));
  } catch {
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

function shouldSkipDiscoveryDir(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (isBlockedAutoRootName(normalized)) {
    return true;
  }
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

function discoverScannerRoots() {
  if (!ENABLE_AUTO_DISCOVER_ROOTS || !fs.existsSync(DEFAULT_MEDIA_LIBRARY_ROOT)) {
    return [];
  }

  const queue = [{ folderPath: DEFAULT_MEDIA_LIBRARY_ROOT, depth: 0 }];
  const discovered = [];
  const seenPaths = new Set();

  while (queue.length) {
    const current = queue.shift();
    for (const dirName of listDirectories(current.folderPath)) {
      if (shouldSkipDiscoveryDir(dirName)) {
        continue;
      }

      const absolutePath = path.join(current.folderPath, dirName);
      const normalizedPath = normalizePathForCompare(absolutePath);
      if (seenPaths.has(normalizedPath)) {
        continue;
      }
      seenPaths.add(normalizedPath);

      const classification = classifyAutoDiscoveredRoot(absolutePath);
      if (classification) {
        const relativePath = path.relative(DEFAULT_MEDIA_LIBRARY_ROOT, absolutePath).split(path.sep).join('/');
        const publicPath = relativePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
        const autoId = `auto-${slugify(relativePath)}`;
        discovered.push({
          id: autoId,
          label: `Auto: ${cleanTitle(dirName)}`,
          type: classification.type,
          scanPath: absolutePath,
          publicBaseUrl: `/${publicPath}`.replace(/%2F/g, '/'),
          language: classification.type === 'series' ? 'English' : 'Unknown',
          category: classification.type === 'series' ? 'TV Series' : 'Auto Movies',
          maxDepth: classification.type === 'movie' ? DEFAULT_MOVIE_DEPTH : 2,
          batchSize: classification.type === 'movie' ? 40 : 30,
          discovered: true,
        });
        continue;
      }

      if (current.depth < AUTO_DISCOVER_MAX_DEPTH && hasVideoInTree(absolutePath, 2)) {
        queue.push({ folderPath: absolutePath, depth: current.depth + 1 });
      }
    }
  }

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
    const overlapsConfiguredRoot = configured.some((configuredRoot) => pathsOverlap(configuredRoot.scanPath, root.scanPath));
    if (!configuredPathSet.has(discoveredPath) && !overlapsConfiguredRoot) {
      merged.push(root);
    }
  }
  return merged;
}

function listScannerRoots() {
  return getEffectiveRoots();
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
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
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
  } catch {
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

    for (const directory of listDirectories(current.folderPath)) {
      const absolutePath = path.join(current.folderPath, directory);
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
    const minSize = contentType === 'series' ? MIN_EPISODE_SIZE : MIN_MOVIE_SIZE;
    if (stats.size < minSize) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

function listVideoFiles(files, dirPath, contentType = 'movie') {
  return files.filter((file) => isValidMediaFile(path.join(dirPath, file), contentType));
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
  const videoFiles = listVideoFiles(files, folderPath, 'movie');

  if (!videoFiles.length) {
    return [];
  }

  if (shouldExpandMovieFolder(relativeFolder, folderName, videoFiles)) {
    return videoFiles.map((videoFile) => {
      const titleSource = cleanTitle(videoFile);
      return {
        titleSource,
        slugSource: titleSource,
        year: extractYear(titleSource) || extractYear(relativeFolder) || extractYear(folderName),
        videoUrl: toPublicUrl(root, path.join(folderPath, videoFile)),
        sourcePath: path.join(folderPath, videoFile),
        sourcePublicPath: toPublicUrl(root, path.join(folderPath, videoFile)),
        scanSignature: `${root.id}:${relativeFolder === '.' ? '' : `${relativeFolder}/`}${videoFile}`,
      };
    });
  }

  const titleSource = folderName;
  return [{
    titleSource,
    slugSource: titleSource,
    year: extractYear(relativeFolder) || extractYear(folderName),
    videoUrl: toPublicUrl(root, path.join(folderPath, videoFiles[0])),
    sourcePath: folderPath,
    sourcePublicPath: toPublicUrl(root, folderPath),
    scanSignature: `${root.id}:${relativeFolder}`,
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

function hasAllCandidatesInCatalog(candidates = []) {
  return Promise.all(candidates.map((candidate) => getItemByScanSignature(candidate.scanSignature)))
    .then((items) => items.every(Boolean));
}

function createBaseScannerItem(root, values) {
  return {
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
}

function loadRootState(rootId) {
  const state = loadScannerState();
  return state.roots?.[rootId] || { folders: {}, lastCompletedAt: '' };
}

async function saveRootState(rootId, nextRootState) {
  const state = loadScannerState();
  state.roots = state.roots || {};
  state.roots[rootId] = nextRootState;
  await saveScannerState(state);
}

function compactSummary(summary) {
  if (!summary) {
    return null;
  }

  return {
    ...summary,
    drafts: [],
    errors: Array.isArray(summary.errors) ? summary.errors.slice(0, 10) : [],
    skipped: Array.isArray(summary.skipped) ? summary.skipped.slice(0, 10) : [],
    rootResults: Array.isArray(summary.rootResults)
      ? summary.rootResults.map((root) => ({
          ...root,
          errors: Array.isArray(root.errors) ? root.errors.slice(0, 5) : [],
        }))
      : [],
  };
}

function serializeJob(job) {
  if (!job) {
    return null;
  }

  return {
    ...job,
    summary: compactSummary(job.summary),
  };
}

async function updateRuntimeJob(job) {
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

async function processMovieRoot(root, summary, progressCallback, scanContext) {
  const rootState = loadRootState(root.id);
  const nextRootState = {
    folders: { ...(rootState.folders || {}) },
    lastCompletedAt: '',
  };
  const candidateFolders = collectDirectoriesIncrementally(root.scanPath, root.maxDepth || DEFAULT_MOVIE_DEPTH);
  const seenSignatures = new Set();

  updateRootProgress(summary, root.id, {
    status: 'running',
    totalCandidates: candidateFolders.length,
  });

  for (let start = 0; start < candidateFolders.length; start += root.batchSize || DEFAULT_BATCH_SIZE) {
    const batch = candidateFolders.slice(start, start + (root.batchSize || DEFAULT_BATCH_SIZE));

    for (const folderPath of batch) {
      const relativeFolder = path.relative(root.scanPath, folderPath) || '.';
      const files = listFiles(folderPath);
      const nestedDirectories = listDirectories(folderPath);
      const fingerprint = getFolderFingerprint(folderPath);
      const previousFingerprint = rootState.folders?.[relativeFolder]?.fingerprint;
      const isSeriesFolder = relativeFolder !== '.' && detectSeriesFolder(root, folderPath, files, nestedDirectories);
      const movieCandidates = isSeriesFolder ? [] : buildMovieCandidates(root, folderPath, relativeFolder, files);

      updateRootProgress(summary, root.id, {
        processed: Math.min(start + batch.indexOf(folderPath) + 1, candidateFolders.length),
      });

      if (!movieCandidates.length) {
        if (!isSeriesFolder) {
          continue;
        }

        const { seasons, seriesFiles } = buildSeriesSeasons(root, path.basename(folderPath), folderPath);
        if (!seasons.length) {
          continue;
        }

        const item = createBaseScannerItem(root, {
          title: cleanTitle(path.basename(folderPath)),
          slug: slugify(path.basename(folderPath)),
          type: 'series',
          year: extractYear(relativeFolder) || extractYear(path.basename(folderPath)),
          poster: pickPoster(root, folderPath, seriesFiles),
          backdrop: pickBackdrop(root, folderPath, seriesFiles),
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

        const enrichedItem = assignScannerTaxonomy(await enrichItemWithMetadata(item));
        const result = await upsertScannedItem(enrichedItem);
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

        const current = summary.rootResults.find((entry) => entry.id === root.id);
        updateRootProgress(summary, root.id, {
          discovered: (current?.discovered || 0) + 1,
          created: (current?.created || 0) + (result.created ? 1 : 0),
          updated: (current?.updated || 0) + (result.updated ? 1 : 0),
          duplicateDrafts: (current?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
        });
        continue;
      }

      if (previousFingerprint && previousFingerprint === fingerprint && await hasAllCandidatesInCatalog(movieCandidates)) {
        summary.unchanged += movieCandidates.length;
        const current = summary.rootResults.find((entry) => entry.id === root.id);
        updateRootProgress(summary, root.id, { unchanged: (current?.unchanged || 0) + movieCandidates.length });
        continue;
      }

      await deleteItemsByScanSignatures(getLegacyMovieSignatures(root, relativeFolder, folderPath, movieCandidates));

      for (const candidate of movieCandidates) {
        if (seenSignatures.has(candidate.scanSignature)) {
          continue;
        }
        seenSignatures.add(candidate.scanSignature);

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

        const enrichedItem = assignScannerTaxonomy(await enrichItemWithMetadata(item));
        const result = await upsertScannedItem(enrichedItem);
        nextRootState.folders[relativeFolder] = {
          fingerprint,
          scanSignature: candidate.scanSignature,
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

        const current = summary.rootResults.find((entry) => entry.id === root.id);
        updateRootProgress(summary, root.id, {
          discovered: (current?.discovered || 0) + 1,
          created: (current?.created || 0) + (result.created ? 1 : 0),
          updated: (current?.updated || 0) + (result.updated ? 1 : 0),
          duplicateDrafts: (current?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
        });
      }
    }

    if (progressCallback) {
      progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
    }
    await waitForImmediate();
  }

  const deletedCount = await deleteScannerItemsNotInSignatures(root.id, [...seenSignatures]);
  summary.deleted += deletedCount;
  const current = summary.rootResults.find((entry) => entry.id === root.id);
  updateRootProgress(summary, root.id, {
    deleted: (current?.deleted || 0) + deletedCount,
  });

  nextRootState.lastCompletedAt = new Date().toISOString();
  await saveRootState(root.id, nextRootState);
  updateRootProgress(summary, root.id, {
    status: 'completed',
  });
}

async function processSeriesRoot(root, summary, progressCallback, scanContext) {
  const rootState = loadRootState(root.id);
  const nextRootState = {
    folders: { ...(rootState.folders || {}) },
    lastCompletedAt: '',
  };
  const seriesFolders = listDirectories(root.scanPath);
  const seenSignatures = new Set();

  updateRootProgress(summary, root.id, {
    status: 'running',
    totalCandidates: seriesFolders.length,
  });

  for (let start = 0; start < seriesFolders.length; start += root.batchSize || DEFAULT_BATCH_SIZE) {
    const batch = seriesFolders.slice(start, start + (root.batchSize || DEFAULT_BATCH_SIZE));

    for (const folderName of batch) {
      const seriesPath = path.join(root.scanPath, folderName);
      const relativeFolder = folderName;
      const fingerprint = getFolderFingerprint(seriesPath);
      const previousFingerprint = rootState.folders?.[relativeFolder]?.fingerprint;
      const seriesFiles = listFiles(seriesPath);
      updateRootProgress(summary, root.id, {
        processed: Math.min(start + batch.indexOf(folderName) + 1, seriesFolders.length),
      });

      if (previousFingerprint && previousFingerprint === fingerprint && await getItemByScanSignature(`${root.id}:${folderName}`)) {
        summary.unchanged += 1;
        const current = summary.rootResults.find((entry) => entry.id === root.id);
        updateRootProgress(summary, root.id, { unchanged: (current?.unchanged || 0) + 1 });
        continue;
      }

      const { seasons } = buildSeriesSeasons(root, folderName, seriesPath);

      if (!seasons.length) {
        continue;
      }

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
        scanSignature: `${root.id}:${folderName}`,
        lastScanRunId: scanContext.runId,
        lastScanRunAt: scanContext.startedAt,
      });
      seenSignatures.add(item.scanSignature);

      const enrichedItem = assignScannerTaxonomy(await enrichItemWithMetadata(item));
      const result = await upsertScannedItem(enrichedItem);
      nextRootState.folders[relativeFolder] = {
        fingerprint,
        scanSignature: enrichedItem.scanSignature,
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

      const current = summary.rootResults.find((entry) => entry.id === root.id);
      updateRootProgress(summary, root.id, {
        discovered: (current?.discovered || 0) + 1,
        created: (current?.created || 0) + (result.created ? 1 : 0),
        updated: (current?.updated || 0) + (result.updated ? 1 : 0),
        duplicateDrafts: (current?.duplicateDrafts || 0) + (result.item.duplicateCount > 0 ? 1 : 0),
      });
    }

    if (progressCallback) {
      progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
    }
    await waitForImmediate();
  }

  const deletedCount = await deleteScannerItemsNotInSignatures(root.id, [...seenSignatures]);
  summary.deleted += deletedCount;
  const current = summary.rootResults.find((entry) => entry.id === root.id);
  updateRootProgress(summary, root.id, {
    deleted: (current?.deleted || 0) + deletedCount,
  });

  nextRootState.lastCompletedAt = new Date().toISOString();
  await saveRootState(root.id, nextRootState);
  updateRootProgress(summary, root.id, {
    status: 'completed',
  });
}

function summarizeRoot(root) {
  const pathAssessment = assessScanPath(root.scanPath);
  const effectiveMaxDepth = root.maxDepth ?? (root.type === 'movie' ? DEFAULT_MOVIE_DEPTH : 1);
  const effectiveBatchSize = root.batchSize ?? DEFAULT_BATCH_SIZE;
  const state = loadRootState(root.id);
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
    if (root.type === 'movie') {
      entry.estimatedCandidates = collectDirectoriesIncrementally(root.scanPath, effectiveMaxDepth).length;
    } else {
      entry.estimatedCandidates = listDirectories(root.scanPath).length;
    }
  } catch (error) {
    entry.error = error.message;
  }

  return entry;
}

function getScannerHealth() {
  const roots = getEffectiveRoots().map(summarizeRoot);
  const runs = getScannerRuns(10);
  const healthyRoots = roots.filter((root) => root.checkable && root.exists && !root.error).length;
  const brokenRoots = roots.filter((root) => root.checkable && !root.exists).length;
  const remoteRoots = roots.filter((root) => !root.checkable).length;

  return {
    checkedAt: new Date().toISOString(),
    totalRoots: roots.length,
    healthyRoots,
    brokenRoots,
    remoteRoots,
    roots,
    recentRuns: runs,
    currentJob: serializeJob(currentScanJob),
  };
}

async function scanSelectedRoots(selectedRootIds = [], progressCallback, options = {}) {
  const effectiveRoots = getEffectiveRoots();
  const roots = selectedRootIds.length
    ? effectiveRoots.filter((root) => selectedRootIds.includes(root.id))
    : effectiveRoots;

  const summary = createSummary(roots);
  const scanContext = {
    runId: options.runId || `${Date.now()}`,
    startedAt: summary.startedAt,
  };

  for (const root of roots) {
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
      if (progressCallback) {
        progressCallback(buildProgressPayload(summary, { activeRootId: root.id }));
      }
      continue;
    }

    try {
      if (root.type === 'series') {
        await processSeriesRoot(root, summary, progressCallback, scanContext);
      } else {
        await processMovieRoot(root, summary, progressCallback, scanContext);
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
  await recordScannerRun({
    id: scanContext.runId,
    startedAt: summary.startedAt,
    completedAt: summary.completedAt,
    rootsRequested: summary.rootsRequested,
    rootsScanned: summary.rootsScanned,
    created: summary.created,
    updated: summary.updated,
    unchanged: summary.unchanged,
    deleted: summary.deleted,
    duplicateDrafts: summary.duplicateDrafts,
    skipped: summary.skipped,
    errors: summary.errors,
    rootResults: summary.rootResults,
  });

  return summary;
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
        summary: message.summary,
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
        summary: message.summary,
      };
      void updateRuntimeJob(currentScanJob);
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
      void updateRuntimeJob(currentScanJob);
    }
    currentScanChild = null;
  });
}

function startScanJob(selectedRootIds = []) {
  if (currentScanJob?.status === 'running') {
    return currentScanJob;
  }

  const rootIds = Array.isArray(selectedRootIds) ? [...selectedRootIds] : [];
  currentScanJob = {
    id: `${Date.now()}`,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: '',
    updatedAt: new Date().toISOString(),
    rootIds,
    summary: createSummary(getEffectiveRoots().filter((root) => !rootIds.length || rootIds.includes(root.id))),
    error: '',
  };
  void updateRuntimeJob(currentScanJob);

  const workerPath = path.resolve(__dirname, 'scanner-worker.js');

  let child;
  try {
    child = fork(workerPath, [], {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: {
        ...process.env,
        SCANNER_ROOT_IDS: JSON.stringify(rootIds),
        SCANNER_RUN_ID: currentScanJob.id,
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
    try {
      currentScanChild.kill('SIGTERM');
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
  void updateRuntimeJob(currentScanJob);
  currentScanChild = null;
  return serializeJob(currentScanJob);
}

function getCurrentScanJob() {
  return serializeJob(currentScanJob);
}

function bootstrapScannerRuntime() {
  const runtime = loadScannerRuntime();
  if (runtime.currentJob && runtime.currentJob.status === 'running') {
    currentScanJob = {
      ...runtime.currentJob,
      status: 'interrupted',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: 'Scanner process restarted before completion.',
    };
    void updateRuntimeJob(currentScanJob);
    return;
  }

  currentScanJob = serializeJob(runtime.currentJob) || null;
  if (currentScanJob) {
    void updateRuntimeJob(currentScanJob);
  }
}

function bootstrapAutoScanScheduler() {
  if (AUTO_SCAN_INTERVAL_MINUTES <= 0 || autoScanTimer) {
    return;
  }

  const intervalMs = AUTO_SCAN_INTERVAL_MINUTES * 60 * 1000;
  autoScanTimer = setInterval(() => {
    if (currentScanJob?.status === 'running') {
      return;
    }
    startScanJob([]);
  }, intervalMs);

  if (typeof autoScanTimer.unref === 'function') {
    autoScanTimer.unref();
  }
}

bootstrapScannerRuntime();
bootstrapAutoScanScheduler();

module.exports = {
  getCurrentScanJob,
  getScannerHealth,
  listScannerRoots,
  scanSelectedRoots,
  startScanJob,
  stopScanJob,
  __test__: {
    classifyAutoDiscoveredRoot,
    parseEpisodeIdentity,
    detectSeriesFolder,
    assignScannerTaxonomy,
  },
};
