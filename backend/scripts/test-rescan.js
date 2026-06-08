require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db, ensureContentStore } = require('../src/data/store/base');
const { loadScannerRoots } = require('../src/data/store/scanner');
const { enrichItemWithMetadata } = require('../src/services/metadata-enricher');
const { upsertScannedItem } = require('../src/data/store/scanner');
const fs = require('fs');
const path = require('path');

const SMILE_ID = 5549;
const SMILE_DIR = '/var/www/html/English_Movies/2024/Smile 2 (2024)';

// Replicate scanner helper functions from scanner.js or reconcile-scanner-library.js
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.webm']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function listDirectoryEntries(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.name !== '_duplicate_hold' && !entry.name.startsWith('.'));
  } catch {
    return [];
  }
}
function listFiles(dirPath) {
  return listDirectoryEntries(dirPath).filter((entry) => entry.isFile()).map((entry) => entry.name);
}
function listVideoFiles(files) {
  return files.filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()));
}
function cleanTitle(val) {
  return val.replace(/\b(19|20)\d{2}\b/g, '').replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
}
function slugify(val) {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function toPublicUrl(root, absolutePath) {
  const relativePath = path.relative(root.scanPath, absolutePath).split(path.sep).join('/');
  return `${root.publicBaseUrl}/${relativePath.split('/').map(encodeURIComponent).join('/')}`.replace(/%2520/g, '%20');
}
function isYearFolderName(value) {
  return /^(19|20)\d{2}$/.test(String(value || '').trim());
}
function shouldExpandMovieFolder(relativeFolder, folderName, videoFiles) {
  if (videoFiles.length > 1) return true;
  if (relativeFolder === '.') return true;
  return isYearFolderName(folderName);
}
function extractYear(value) {
  const match = String(value || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function buildMovieCandidates(root, folderPath, relativeFolder, files) {
  const folderName = path.basename(folderPath);
  const videoFiles = listVideoFiles(files);
  if (!videoFiles.length) return [];

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

async function main() {
  await ensureContentStore();

  console.log('1. Checking files in Smile 2 directory...');
  const files = listFiles(SMILE_DIR);
  console.log('Files:', files);

  console.log('\n2. Deleting misclassified Smile 2 from DB...');
  await db.query('DELETE FROM content_catalog WHERE id = $1', [SMILE_ID]);

  console.log('\n3. Re-scanning as movie candidate...');
  const roots = loadScannerRoots();
  const englishRoot = roots.find(r => r.id === 'english-movies');
  console.log('Root:', englishRoot.id, 'path:', englishRoot.scanPath);

  const relativeFolder = path.relative(englishRoot.scanPath, SMILE_DIR);
  console.log('Relative folder:', relativeFolder);

  const candidates = buildMovieCandidates(englishRoot, SMILE_DIR, relativeFolder, files);
  console.log('Candidates:', JSON.stringify(candidates, null, 2));

  if (candidates.length) {
    const cand = candidates[0];
    const base = {
      ...cand,
      language: englishRoot.language,
      category: englishRoot.category,
      sourceRootId: englishRoot.id,
      sourceRootLabel: englishRoot.label,
      sourceType: 'scanner',
      quality: 'HD',
      status: 'published',
      lastScannedAt: new Date().toISOString(),
      titleKey: cand.title.toLowerCase().replace(/[^a-z0-9]+/g, ''),
      type: 'movie',
      poster: '',
      backdrop: ''
    };

    console.log('\n4. Enriches with metadata...');
    const enriched = await enrichItemWithMetadata(base);
    console.log(`Enriched title: ${enriched.title}, TMDB: ${enriched.tmdbId}, Status: ${enriched.metadataStatus}`);

    console.log('\n5. Upserting into DB...');
    const result = await upsertScannedItem({
      ...enriched,
      status: 'published'
    });
    console.log(`Upsert result: created=${result.created}, updated=${result.updated}`);
    console.log(`New DB Item ID: ${result.item.id}, Type: ${result.item.type}, Status: ${result.item.status}`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
