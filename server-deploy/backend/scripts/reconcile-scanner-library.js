require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const {
  deleteScannerItemsNotInSignatures,
  ensureContentStore,
  loadScannerRoots,
  normalizeTitleKey,
  upsertScannedItem,
} = require('../src/data/store');
const { enrichItemWithMetadata } = require('../src/services/metadata-enricher');
const {
  buildSeriesSeasons,
  cleanTitle,
  slugify,
} = require('../src/services/scanner-series-parser');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.webm']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DUPLICATE_HOLD_DIR_NAME = process.env.MEDIA_NORMALIZER_DUPLICATE_DIR || '_duplicate_hold';
const DEFAULT_MOVIE_DEPTH = 1;

function extractYear(value) {
  const match = String(value || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
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

function collectDirectoriesIncrementally(rootPath, maxDepth = DEFAULT_MOVIE_DEPTH) {
  const results = [rootPath];
  const queue = [{ folderPath: rootPath, depth: 0 }];

  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    for (const folderName of listDirectories(current.folderPath)) {
      const folderPath = path.join(current.folderPath, folderName);
      results.push(folderPath);
      queue.push({ folderPath, depth: current.depth + 1 });
    }
  }

  return results;
}

function toPublicUrl(root, absolutePath) {
  const relativePath = path.relative(root.scanPath, absolutePath).split(path.sep).join('/');
  return `${root.publicBaseUrl}/${relativePath.split('/').map(encodeURIComponent).join('/')}`.replace(/%2520/g, '%20');
}

function pickImageByIntent(root, folderPath, files, intent = 'poster') {
  const patterns = intent === 'poster'
    ? [/^(poster|cover|folder|front)$/i, /(poster|cover|folder|front)/i, /(backdrop|banner|fanart)/i]
    : [/^(backdrop|banner|fanart)$/i, /(backdrop|banner|fanart)/i, /(poster|cover|folder|front)/i];
  const imageFiles = files.filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));

  if (!imageFiles.length) {
    return '';
  }

  const ranked = [...imageFiles].sort((left, right) => {
    const leftBase = cleanTitle(left);
    const rightBase = cleanTitle(right);
    const leftRank = patterns.findIndex((pattern) => pattern.test(leftBase));
    const rightRank = patterns.findIndex((pattern) => pattern.test(rightBase));
    const leftScore = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank;
    const rightScore = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  });

  return toPublicUrl(root, path.join(folderPath, ranked[0]));
}

function pickPoster(root, folderPath, files) {
  return pickImageByIntent(root, folderPath, files, 'poster');
}

function pickBackdrop(root, folderPath, files) {
  return pickImageByIntent(root, folderPath, files, 'backdrop') || pickPoster(root, folderPath, files);
}

function listVideoFiles(files) {
  return files.filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()));
}

function isYearFolderName(value) {
  return /^(19|20)\d{2}$/.test(String(value || '').trim());
}

function shouldExpandMovieFolder(relativeFolder, folderName, videoFiles) {
  if (videoFiles.length > 1) return true;
  if (relativeFolder === '.') return true;
  return isYearFolderName(folderName);
}

function buildMovieCandidates(root, folderPath, relativeFolder, files) {
  const folderName = path.basename(folderPath);
  const videoFiles = listVideoFiles(files);

  if (!videoFiles.length) {
    return [];
  }

  if (shouldExpandMovieFolder(relativeFolder, folderName, videoFiles)) {
    return videoFiles.map((videoFile) => {
      const titleSource = cleanTitle(videoFile);
      return {
        title: titleSource,
        slug: slugify(titleSource),
        year: extractYear(titleSource) || extractYear(relativeFolder) || extractYear(folderName),
        videoUrl: toPublicUrl(root, path.join(folderPath, videoFile)),
        sourcePath: path.join(folderPath, videoFile),
        sourcePublicPath: toPublicUrl(root, path.join(folderPath, videoFile)),
        scanSignature: `${root.id}:${relativeFolder === '.' ? '' : `${relativeFolder}/`}${videoFile}`,
      };
    });
  }

  return [{
    title: folderName,
    slug: slugify(folderName),
    year: extractYear(relativeFolder) || extractYear(folderName),
    videoUrl: toPublicUrl(root, path.join(folderPath, videoFiles[0])),
    sourcePath: folderPath,
    sourcePublicPath: toPublicUrl(root, folderPath),
    scanSignature: `${root.id}:${relativeFolder}`,
  }];
}

function createBaseScannerItem(root, values) {
  return {
    language: root.language,
    category: root.category,
    sourceRootId: root.id,
    sourceRootLabel: root.label,
    sourceType: 'scanner',
    quality: 'HD',
    status: 'published',
    lastScannedAt: new Date().toISOString(),
    titleKey: normalizeTitleKey(values.title),
    ...values,
  };
}

async function reconcileMovieRoot(root, summary) {
  const candidateFolders = collectDirectoriesIncrementally(root.scanPath, root.maxDepth ?? DEFAULT_MOVIE_DEPTH);
  const seen = new Set();

  for (const folderPath of candidateFolders) {
    const relativeFolder = path.relative(root.scanPath, folderPath) || '.';
    const files = listFiles(folderPath);
    const candidates = buildMovieCandidates(root, folderPath, relativeFolder, files);
    for (const candidate of candidates) {
      seen.add(candidate.scanSignature);
      const base = createBaseScannerItem(root, {
        ...candidate,
        type: 'movie',
        poster: pickPoster(root, folderPath, files),
        backdrop: pickBackdrop(root, folderPath, files),
      });
      const enriched = await enrichItemWithMetadata(base);
      const result = await upsertScannedItem({
        ...enriched,
        status: 'published',
      });
      if (result.created) summary.created += 1;
      if (result.updated) summary.updated += 1;
      summary.processed += 1;
    }
  }

  summary.deleted += await deleteScannerItemsNotInSignatures(root.id, [...seen]);
  summary.rootCounts[root.id] = seen.size;
}

async function reconcileSeriesRoot(root, summary) {
  const seriesFolders = listDirectories(root.scanPath);
  const seen = new Set();

  for (const folderName of seriesFolders) {
    const seriesPath = path.join(root.scanPath, folderName);
    const seriesFiles = listFiles(seriesPath);
    const seasonFolderNames = listDirectories(seriesPath);
    const seasons = [];

    if (seasonFolderNames.length) {
      const built = buildSeriesSeasons(root, folderName, seriesPath, {
        listFiles: (targetPath) => listFiles(targetPath),
        listDirectories: (targetPath) => listDirectories(targetPath),
        listVideoFiles: (files, targetPath) => files.filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase())),
        toPublicUrl,
      });
      seasons.push(...built.seasons);
    } else {
      const episodeFiles = seriesFiles.filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()));
      if (episodeFiles.length) {
        const built = buildSeriesSeasons(root, folderName, seriesPath, {
          listFiles: (targetPath) => listFiles(targetPath),
          listDirectories: (targetPath) => listDirectories(targetPath),
          listVideoFiles: (files, targetPath) => files.filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase())),
          toPublicUrl,
        });
        seasons.push(...built.seasons);
      }
    }

    if (!seasons.length) {
      continue;
    }

    const scanSignature = `${root.id}:${folderName}`;
    seen.add(scanSignature);
    const base = createBaseScannerItem(root, {
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
      scanSignature,
    });
    const enriched = await enrichItemWithMetadata(base);
    const result = await upsertScannedItem({
      ...enriched,
      status: 'published',
    });
    if (result.created) summary.created += 1;
    if (result.updated) summary.updated += 1;
    summary.processed += 1;
  }

  summary.deleted += await deleteScannerItemsNotInSignatures(root.id, [...seen]);
  summary.rootCounts[root.id] = seen.size;
}

async function main() {
  await ensureContentStore();
  const roots = loadScannerRoots();
  const summary = {
    startedAt: new Date().toISOString(),
    roots: roots.length,
    processed: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    rootCounts: {},
  };

  for (const root of roots) {
    if (!root?.scanPath || !fs.existsSync(root.scanPath)) {
      continue;
    }
    if (root.type === 'series') {
      await reconcileSeriesRoot(root, summary);
    } else {
      await reconcileMovieRoot(root, summary);
    }
    console.log(`[reconcile] ${root.id} processed=${summary.rootCounts[root.id] || 0} created=${summary.created} updated=${summary.updated} deleted=${summary.deleted}`);
  }

  summary.completedAt = new Date().toISOString();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
