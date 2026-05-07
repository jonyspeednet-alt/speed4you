const fs = require('fs');
const path = require('path');

const ONE_MEBIBYTE = 1024 * 1024;
const DEFAULT_PRODUCTION_PLAYER_CACHE_ROOT = '/var/www/html/Extra_Storage/portal-media-cache';
const DEFAULT_DEVELOPMENT_PLAYER_CACHE_ROOT = path.resolve(__dirname, '..', '..', '.cache', 'player-media');

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
const DEFAULT_PLAYER_CACHE_ROOT = nodeEnv === 'production'
  ? DEFAULT_PRODUCTION_PLAYER_CACHE_ROOT
  : DEFAULT_DEVELOPMENT_PLAYER_CACHE_ROOT;

const PLAYER_CACHE_ROOT = path.resolve(process.env.PLAYER_CACHE_ROOT || DEFAULT_PLAYER_CACHE_ROOT);
const PLAYER_CACHE_READY_MIN_BYTES = toPositiveInt(process.env.PLAYER_CACHE_READY_MIN_BYTES, ONE_MEBIBYTE);
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_BIN = process.env.FFPROBE_PATH || 'ffprobe';

function normalizeEpisodeNumber(value) {
  return toPositiveInt(value, 1);
}

function buildPlayerCacheKey({ contentType = 'movie', contentId, seasonNumber = 1, episodeNumber = 1 }) {
  return `${contentType}-${contentId}-s${normalizeEpisodeNumber(seasonNumber)}-e${normalizeEpisodeNumber(episodeNumber)}`;
}

function buildPlayerCachePath(entry) {
  return path.join(PLAYER_CACHE_ROOT, `${buildPlayerCacheKey(entry)}.mp4`);
}

function ensurePlayerCacheRoot() {
  fs.mkdirSync(PLAYER_CACHE_ROOT, { recursive: true });
  return PLAYER_CACHE_ROOT;
}

function isCacheReadyStat(stat) {
  if (!stat) {
    return false;
  }

  if (typeof stat.isFile === 'function' && !stat.isFile()) {
    return false;
  }

  return Number(stat.size || 0) >= PLAYER_CACHE_READY_MIN_BYTES;
}

function isCacheReadyPath(targetPath) {
  try {
    return isCacheReadyStat(fs.statSync(targetPath));
  } catch {
    return false;
  }
}

module.exports = {
  ONE_MEBIBYTE,
  DEFAULT_PRODUCTION_PLAYER_CACHE_ROOT,
  DEFAULT_DEVELOPMENT_PLAYER_CACHE_ROOT,
  DEFAULT_PLAYER_CACHE_ROOT,
  PLAYER_CACHE_ROOT,
  PLAYER_CACHE_READY_MIN_BYTES,
  FFMPEG_BIN,
  FFPROBE_BIN,
  buildPlayerCacheKey,
  buildPlayerCachePath,
  ensurePlayerCacheRoot,
  isCacheReadyStat,
  isCacheReadyPath,
};
