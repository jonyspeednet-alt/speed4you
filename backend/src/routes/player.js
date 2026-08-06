const express = require('express');
const fs = require('fs');
const path = require('path');
const { getItemById, loadScannerRoots } = require('../data/store');
const { AppError } = require('../utils/error');
const logger = require('../utils/logger');

const router = express.Router();
router.get('/:contentType/:id/preview', require('../middleware/require-admin-auth'), async (req, res, next) => {
  try {
    const item = await getItemById(req.params.id);
    if (!item) {
      throw new AppError('Content not found', 404, 'NOT_FOUND');
    }
    // For admin preview, allow access regardless of status
    const selection = await findSelectedMediaForPreview(req, item);
    if (selection.error) {
      throw new AppError(selection.error.message, selection.error.status, 'MEDIA_SELECTION_ERROR');
    }
    const { sourcePath, videoUrl, item: contentItem, seasonNumber, episodeNumber } = selection;
    const resolvedPath = resolvePlayableFilePath(sourcePath, videoUrl);
    if (!resolvedPath) {
      if (process.env.REMOTE_MEDIA_BASE_URL && videoUrl) {
        return res.redirect(`${process.env.REMOTE_MEDIA_BASE_URL}${videoUrl}`);
      }
      throw new AppError('Source file is not available for preview', 404, 'NOT_FOUND');
    }
    const stat = safeStat(resolvedPath);
    if (!stat?.isFile()) {
      throw new AppError('Source file is not available on the server for preview', 404, 'NOT_FOUND');
    }
    const ext = path.extname(resolvedPath).toLowerCase() || '.mp4';
    let filename = contentItem.title;
    if (contentItem.type === 'series') {
      const sPad = String(seasonNumber).padStart(2, '0');
      const ePad = String(episodeNumber).padStart(2, '0');
      filename = `${contentItem.title} - S${sPad}E${ePad}`;
    }
    filename = filename.replace(/[\\/:*?"<>|]/g, '_');
    const cleanFilename = `${filename}${ext}`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanFilename)}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    next(error);
  }
});


function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function toPositiveInt(value, fallback) {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.floor(asNumber);
  }
  const match = String(value || '').match(/(\d+)/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return fallback;
}

async function findSelectedMedia(req) {
  const { id } = req.params;
  const requestedType = String(req.params.contentType || '').toLowerCase();
  const seasonNumber = toPositiveInt(req.query.season, 1);
  const episodeNumber = toPositiveInt(req.query.episode, 1);
  const item = await getItemById(id);
  if (!item) return { error: { status: 404, message: 'Content not found' } };
  if (requestedType && item.type !== requestedType) return { error: { status: 404, message: 'Content not found' } };
  if (item.status !== 'published') return { error: { status: 404, message: 'Content not found' } };

  const selectedSeason = item.type === 'series'
    ? (item.seasons || []).find((season, index) => toPositiveInt(season?.number ?? season?.id, index + 1) === seasonNumber)
    || item.seasons?.[0] : null;
  const selectedEpisode = item.type === 'series'
    ? (selectedSeason?.episodes || []).find((episode, index) => toPositiveInt(episode?.number ?? episode?.id, index + 1) === episodeNumber)
    || selectedSeason?.episodes?.[episodeNumber - 1] || selectedSeason?.episodes?.[0] : null;

  const videoUrl = item.type === 'movie' ? item.videoUrl : selectedEpisode?.videoUrl;
  const sourcePath = item.type === 'movie' ? item.sourcePath : selectedEpisode?.sourcePath || selectedSeason?.sourcePath || item.sourcePath;
  if (!videoUrl && !sourcePath) return { error: { status: 404, message: 'No playable source found' } };

  return { item, selectedSeason, selectedEpisode, videoUrl, sourcePath, seasonNumber, episodeNumber };
}

async function findSelectedMediaForPreview(req, item) {
  const requestedType = String(req.params.contentType || '').toLowerCase();
  const seasonNumber = toPositiveInt(req.query.season, 1);
  const episodeNumber = toPositiveInt(req.query.episode, 1);
  
  if (requestedType && item.type !== requestedType) return { error: { status: 404, message: 'Content not found' } };

  const selectedSeason = item.type === 'series'
    ? (item.seasons || []).find((season, index) => toPositiveInt(season?.number ?? season?.id, index + 1) === seasonNumber)
    || item.seasons?.[0] : null;
  const selectedEpisode = item.type === 'series'
    ? (selectedSeason?.episodes || []).find((episode, index) => toPositiveInt(episode?.number ?? episode?.id, index + 1) === episodeNumber)
    || selectedSeason?.episodes?.[episodeNumber - 1] || selectedSeason?.episodes?.[0] : null;

  const videoUrl = item.type === 'movie' ? item.videoUrl : selectedEpisode?.videoUrl;
  const sourcePath = item.type === 'movie' ? item.sourcePath : selectedEpisode?.sourcePath || selectedSeason?.sourcePath || item.sourcePath;
  if (!videoUrl && !sourcePath) return { error: { status: 404, message: 'No playable source found' } };

  return { item, selectedSeason, selectedEpisode, videoUrl, sourcePath, seasonNumber, episodeNumber };
}

function decodePublicPath(value) {
  return decodeURIComponent(String(value || '').split('?')[0]);
}

function isPathSafe(resolvedPath, allowedRoot) {
  const normalizedResolved = path.resolve(resolvedPath);
  const normalizedRoot = path.resolve(allowedRoot);
  return normalizedResolved.startsWith(normalizedRoot + path.sep) || normalizedResolved === normalizedRoot;
}

function resolveFilePathFromVideoUrl(videoUrl) {
  const decodedVideoUrl = decodePublicPath(videoUrl);
  if (!decodedVideoUrl) return '';
  const matchingRoot = loadScannerRoots()
    .filter((root) => root?.scanPath && root?.publicBaseUrl)
    .sort((left, right) => String(right.publicBaseUrl).length - String(left.publicBaseUrl).length)
    .find((root) => decodedVideoUrl === root.publicBaseUrl || decodedVideoUrl.startsWith(`${root.publicBaseUrl}/`));
  if (!matchingRoot) return '';
  const relativePath = decodedVideoUrl.slice(matchingRoot.publicBaseUrl.length).replace(/^\/+/, '');
  if (!relativePath) return '';
  const segments = relativePath.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
  if (segments.some((seg) => seg === '..' || seg === '.')) return '';
  const absolutePath = path.join(matchingRoot.scanPath, ...segments);
  if (!isPathSafe(absolutePath, matchingRoot.scanPath)) return '';
  return fs.existsSync(absolutePath) ? absolutePath : '';
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.mpg', '.mpeg', '.ts', '.m2ts']);

function findFirstVideoFile(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
  if (files.length > 0) return path.join(directoryPath, files[0]);
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
  for (const directory of directories) {
    const nested = findFirstVideoFile(path.join(directoryPath, directory));
    if (nested) return nested;
  }
  return '';
}

function resolvePlayableFilePath(sourcePath, videoUrl) {
  const directVideoPath = resolveFilePathFromVideoUrl(videoUrl);
  if (directVideoPath) {
    const directStat = safeStat(directVideoPath);
    if (directStat?.isFile()) return directVideoPath;
  }
  if (!sourcePath || !fs.existsSync(sourcePath)) return '';
  const stat = safeStat(sourcePath);
  if (!stat) return '';
  if (stat.isFile()) return sourcePath;
  if (!stat.isDirectory()) return '';
  const decodedVideoUrl = decodePublicPath(videoUrl);
  const preferredName = path.basename(decodedVideoUrl);
  if (preferredName) {
    const preferredPath = path.join(sourcePath, preferredName);
    const preferredStat = fs.existsSync(preferredPath) ? safeStat(preferredPath) : null;
    if (preferredStat?.isFile()) return preferredPath;
  }
  return findFirstVideoFile(sourcePath);
}

router.get('/download/:contentType/:id', async (req, res, next) => {
  try {
    const selection = await findSelectedMedia(req);
    if (selection.error) {
      throw new AppError(selection.error.message, selection.error.status, 'MEDIA_SELECTION_ERROR');
    }
    const { sourcePath, videoUrl, item, seasonNumber, episodeNumber } = selection;
    const resolvedPath = resolvePlayableFilePath(sourcePath, videoUrl);
    if (!resolvedPath) {
      if (process.env.REMOTE_MEDIA_BASE_URL && videoUrl) {
        return res.redirect(`${process.env.REMOTE_MEDIA_BASE_URL}${videoUrl}`);
      }
      // Log stale path for monitoring
      logger.warn('Player: source file not available', {
        itemId: item.id,
        title: item.title,
        sourcePath,
        videoUrl,
        suggestion: 'Run reconciliation or re-scan to fix stale paths',
      });
      throw new AppError(
        'Source file is not available. The file may have been moved or renamed. Ask admin to re-scan content.',
        404,
        'STALE_PATH',
      );
    }
    const stat = safeStat(resolvedPath);
    if (!stat?.isFile()) {
      throw new AppError('Source file is not available on the server for download', 404, 'NOT_FOUND');
    }
    const ext = path.extname(resolvedPath).toLowerCase() || '.mp4';
    let filename = item.title;
    if (item.type === 'series') {
      const sPad = String(seasonNumber).padStart(2, '0');
      const ePad = String(episodeNumber).padStart(2, '0');
      filename = `${item.title} - S${sPad}E${ePad}`;
    }
    filename = filename.replace(/[\\/:*?"<>|]/g, '_');
    const cleanFilename = `${filename}${ext}`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanFilename)}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    if (!res.headersSent) next(error);
  }
});

module.exports = router;

