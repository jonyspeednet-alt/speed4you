const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { getItemById, loadScannerRoots } = require('../data/store');

const FFPROBE_BIN = process.env.FFPROBE_PATH || 'ffprobe';
const PROBE_TIMEOUT_MS = Number(process.env.MEDIA_PROBE_TIMEOUT_MS || 90000);

// Codecs that play natively in Chrome / Edge / Firefox desktop via <video>
const BROWSER_OK_VIDEO = new Set(['h264', 'avc', 'vp9', 'av1', 'mpeg4']);
const BROWSER_OK_AUDIO = new Set([
  'aac', 'mp3', 'mp2', 'opus', 'vorbis', 'flac',
  'pcm_s16le', 'pcm_s16be', 'pcm_s24le', 'pcm_s32le', 'pcm_f32le', 'pcm_u8',
]);

// Known-bad in desktop browsers: E-AC-3 / AC-3 / DTS / TrueHD never decode in <video>
const BROWSER_BAD_AUDIO = new Set(['eac3', 'ac3', 'dts', 'dca', 'truehd', 'mlp', 'eac3_atmos']);
const BROWSER_BAD_VIDEO = new Set(['hevc', 'h265', 'mpeg2video', 'mpeg1video', 'vc1', 'wmv2', 'wmv3']);

const PRESETS = {
  browser: {
    id: 'browser',
    label: 'Browser compatible (auto)',
    description: 'Only converts what is broken. H.264 video stays untouched, bad audio becomes AAC.',
  },
  'browser-720p': {
    id: 'browser-720p',
    label: 'Browser compatible 720p (fast)',
    description: 'Scales video to 720p H.264 + AAC audio. Smaller file, faster transcode.',
  },
  'audio-only': {
    id: 'audio-only',
    label: 'Audio only (fastest)',
    description: 'Video untouched. Converts bad audio tracks to AAC. Use for sound-only issues.',
  },
};

function runCommand(binary, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const err = new Error(`${binary} failed: ${String(stderr || error.message).slice(0, 500)}`);
        err.code = 'PROBE_FAILED';
        return reject(err);
      }
      resolve(String(stdout || ''));
    });
  });
}

async function probeMediaFile(filePath) {
  const raw = await runCommand(FFPROBE_BIN, [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    filePath,
  ], PROBE_TIMEOUT_MS);
  const parsed = JSON.parse(raw);
  return {
    streams: Array.isArray(parsed.streams) ? parsed.streams : [],
    format: parsed.format || {},
  };
}

function pickTag(stream, ...names) {
  const tags = stream.tags || {};
  for (const name of names) {
    if (tags[name] !== undefined && tags[name] !== null && String(tags[name]) !== '') {
      return String(tags[name]);
    }
  }
  return '';
}

function classifyVideoCodec(codec) {
  const c = String(codec || '').toLowerCase();
  if (BROWSER_OK_VIDEO.has(c)) return 'ok';
  if (BROWSER_BAD_VIDEO.has(c)) return 'bad';
  return 'unknown';
}

function classifyAudioCodec(codec) {
  const c = String(codec || '').toLowerCase();
  if (BROWSER_OK_AUDIO.has(c)) return 'ok';
  if (BROWSER_BAD_AUDIO.has(c)) return 'bad';
  return 'unknown';
}

/**
 * Analyze a probed file and produce a browser-compatibility verdict.
 * Returns { verdict, issues[], video, audios[], subtitles, attachments, durationSec, sizeBytes }
 * verdict: 'compatible' | 'audio_issue' | 'video_issue' | 'both' | 'unknown'
 */
function analyzeProbe(filePath, probe, stat) {
  const streams = probe.streams || [];
  const videoStreams = streams.filter((s) => s.codec_type === 'video' && !isAttachedPic(s));
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');
  const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle');
  const attachedPics = streams.filter((s) => s.codec_type === 'video' && isAttachedPic(s));

  const mainVideo = videoStreams[0] || null;
  const videoStatus = mainVideo ? classifyVideoCodec(mainVideo.codec_name) : 'none';

  const audios = audioStreams.map((s, i) => ({
    outputIndex: i,
    codec: String(s.codec_name || 'unknown'),
    status: classifyAudioCodec(s.codec_name),
    channels: Number(s.channels || 0),
    channelLayout: s.channel_layout || '',
    language: pickTag(s, 'language'),
    title: pickTag(s, 'title'),
    bitRate: Number(s.bit_rate || 0),
    isDefault: s.disposition ? Number(s.disposition.default || 0) === 1 : i === 0,
  }));

  const issues = [];
  if (!mainVideo && audioStreams.length > 0) {
    issues.push({ type: 'video', severity: 'error', message: 'No video stream found in file.' });
  }
  if (mainVideo && videoStatus === 'bad') {
    const name = codecDisplayName(mainVideo.codec_name);
    issues.push({
      type: 'video',
      severity: 'error',
      message: `Video codec ${name} does not play in Chrome / Edge / Firefox. The video will show a black screen or fail to start.`,
      codec: mainVideo.codec_name,
      width: Number(mainVideo.width || 0),
      height: Number(mainVideo.height || 0),
    });
  }
  if (mainVideo && videoStatus === 'unknown') {
    issues.push({
      type: 'video',
      severity: 'warning',
      message: `Video codec ${mainVideo.codec_name || 'unknown'} is unverified — it may not play in all browsers.`,
      codec: mainVideo.codec_name,
    });
  }
  const badAudios = audios.filter((a) => a.status === 'bad');
  if (audioStreams.length === 0) {
    issues.push({ type: 'audio', severity: 'warning', message: 'File has no audio track at all.' });
  } else if (badAudios.length > 0) {
    const names = [...new Set(badAudios.map((a) => codecDisplayName(a.codec)))].join(', ');
    const langs = badAudios.map((a) => a.language || 'und').filter(Boolean).join(', ');
    issues.push({
      type: 'audio',
      severity: 'error',
      message: `Audio codec ${names} (${langs}) has no sound in desktop browsers. Video plays, but silent.`,
      codec: badAudios[0].codec,
    });
  }
  const unknownAudios = audios.filter((a) => a.status === 'unknown');
  if (unknownAudios.length > 0 && badAudios.length === 0) {
    issues.push({
      type: 'audio',
      severity: 'warning',
      message: `Audio codec ${unknownAudios[0].codec} is unverified — sound may not work in all browsers.`,
      codec: unknownAudios[0].codec,
    });
  }

  const hasVideoError = issues.some((i) => i.type === 'video' && i.severity === 'error');
  const hasAudioError = issues.some((i) => i.type === 'audio' && i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const verdict = hasVideoError && hasAudioError
    ? 'both'
    : hasVideoError ? 'video_issue' : hasAudioError ? 'audio_issue' : hasWarning ? 'unknown' : 'compatible';

  let durationSec = Number(probe.format?.duration || 0);
  if (!Number.isFinite(durationSec) || durationSec <= 0) durationSec = 0;

  return {
    filePath,
    exists: true,
    sizeBytes: stat ? Number(stat.size || 0) : 0,
    container: String(probe.format?.format_name || '').split(',')[0] || path.extname(filePath).replace('.', ''),
    durationSec,
    bitRate: Number(probe.format?.bit_rate || 0),
    verdict,
    issues,
    video: mainVideo ? {
      codec: String(mainVideo.codec_name || 'unknown'),
      status: videoStatus,
      width: Number(mainVideo.width || 0),
      height: Number(mainVideo.height || 0),
      profile: mainVideo.profile || '',
    } : null,
    audios,
    subtitleCount: subtitleStreams.length,
    hasAttachments: attachedPics.length > 0,
  };
}

function isAttachedPic(stream) {
  if (stream.disposition && Number(stream.disposition.attached_pic || 0) === 1) return true;
  const codec = String(stream.codec_name || '').toLowerCase();
  if ((codec === 'mjpeg' || codec === 'png') && (!stream.width || Number(stream.width) < 320)) {
    // Small mjpeg/png video streams are almost always cover art
    return true;
  }
  return false;
}

function codecDisplayName(codec) {
  const c = String(codec || 'unknown').toLowerCase();
  const names = {
    eac3: 'EAC3 (Dolby Digital Plus)', ac3: 'AC3 (Dolby Digital)',
    dts: 'DTS', dca: 'DTS', truehd: 'TrueHD', mlp: 'TrueHD',
    hevc: 'HEVC (H.265)', h265: 'HEVC (H.265)', h264: 'H.264',
    aac: 'AAC', av1: 'AV1', vp9: 'VP9',
  };
  return names[c] || String(codec || 'Unknown').toUpperCase();
}

/**
 * Build ffmpeg output args for a transcode. Only converts what is broken.
 * opts: { crf (18-28), videoPreset (ultrafast..slow), audioBitrate (96-320k),
 *         keepSubtitles (bool), audioMode ('all' | 'default') }
 * Returns { args, plan } where plan describes what will happen (for UI).
 */
function buildTranscodeArgs(analysis, presetId, rawOpts = {}) {
  const preset = PRESETS[presetId] || PRESETS.browser;
  const opts = normalizeTranscodeOptions(rawOpts);
  const args = ['-y', '-i', analysis.filePath];
  const plan = { video: 'copy', audio: [], preset: preset.id, options: opts };

  const mapAudios = opts.audioMode === 'default'
    ? analysis.audios.filter((a) => a.isDefault).slice(0, 1)
    : analysis.audios;

  args.push('-map', '0:v:0');
  if (mapAudios.length > 0) args.push('-map', opts.audioMode === 'default' ? '0:a:0' : '0:a?');
  const keepSubs = opts.keepSubtitles && analysis.subtitleCount > 0;
  if (keepSubs) args.push('-map', '0:s?');
  if (analysis.hasAttachments) args.push('-map', '0:t?');

  const needVideoConvert = preset.id === 'browser-720p'
    || !analysis.video
    || analysis.video.status !== 'ok';

  if (!analysis.video) {
    args.push('-c:v', 'copy');
    plan.video = 'copy (no video stream)';
  } else if (preset.id === 'audio-only') {
    args.push('-c:v', 'copy');
    plan.video = 'copy (audio-only preset)';
  } else if (needVideoConvert) {
    args.push('-c:v', 'libx264', '-preset', opts.videoPreset, '-crf', String(opts.crf));
    plan.video = preset.id === 'browser-720p' ? `H.264 720p (re-encode, CRF ${opts.crf})` : `H.264 (re-encode, CRF ${opts.crf})`;
    if (preset.id === 'browser-720p') {
      args.push('-vf', 'scale=-2:720');
    }
  } else {
    args.push('-c:v', 'copy');
    plan.video = 'copy (already H.264)';
  }

  mapAudios.forEach((audio, mapIdx) => {
    // NOTE: specifier must be the OUTPUT audio index (position in mapped set),
    // not the input index — they differ when audioMode === 'default'.
    const out = `:a:${mapIdx}`;
    const needsConvert = preset.id === 'audio-only'
      ? audio.status !== 'ok'
      : audio.status === 'bad' || audio.status === 'unknown';
    if (needsConvert) {
      args.push(`-c${out}`, 'aac', `-b${out}`, `${opts.audioBitrate}k`);
      plan.audio.push(`${audio.language || `track ${audio.outputIndex + 1}`} (${audio.codec.toUpperCase()} → AAC ${opts.audioBitrate}k)`);
    } else {
      args.push(`-c${out}`, 'copy');
      plan.audio.push(`${audio.language || `track ${audio.outputIndex + 1}`} (${audio.codec.toUpperCase()} copy)`);
    }
  });
  if (mapAudios.length === 0) {
    plan.audio.push('no audio tracks');
  } else if (opts.audioMode === 'default' && analysis.audios.length > 1) {
    plan.audio.push(`only default track kept (${analysis.audios.length - 1} dropped)`);
  }

  if (keepSubs) {
    args.push('-c:s', 'copy');
  } else if (analysis.subtitleCount > 0) {
    plan.subtitles = 'dropped (keepSubtitles off)';
  }
  if (analysis.hasAttachments) args.push('-c:t', 'copy');
  args.push('-max_muxing_queue_size', '9999');

  return { args, plan, preset };
}

const X264_PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'];

function normalizeTranscodeOptions(raw = {}) {
  const crfRaw = Number(raw.crf);
  const bitrateRaw = Number(raw.audioBitrate);
  return {
    crf: Number.isFinite(crfRaw) ? Math.max(18, Math.min(28, Math.round(crfRaw))) : 23,
    videoPreset: X264_PRESETS.includes(raw.videoPreset) ? raw.videoPreset : 'veryfast',
    audioBitrate: Number.isFinite(bitrateRaw) ? Math.max(96, Math.min(320, Math.round(bitrateRaw))) : 192,
    keepSubtitles: raw.keepSubtitles !== false,
    audioMode: raw.audioMode === 'default' ? 'default' : 'all',
  };
}

/**
 * Accept a content link, plain ID or slug and extract a lookup key.
 * Supports: "34876", "/movies/34876", full URLs, "/play/movie/34876", slugs.
 */
function parseContentInput(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    const err = new Error('Content link or ID is required');
    err.code = 'BAD_INPUT';
    throw err;
  }
  if (/^\d+$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    return parseContentInput(url.pathname);
  } catch {
    // not a full URL — treat as path or slug
  }
  const segments = raw.split('?')[0].split('#')[0].split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  // Pure number → content ID. Anything else is a slug — getItemById resolves
  // both, so never carve year-numbers (e.g. "-2026") out of slugs.
  if (last && /^\d+$/.test(last)) return last;
  if (last) return decodeURIComponent(last); // slug
  const err = new Error('Could not understand that link. Paste a /movies/... or /series/... link, or a numeric ID.');
  err.code = 'BAD_INPUT';
  throw err;
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
  let roots = [];
  try {
    roots = loadScannerRoots() || [];
  } catch {
    roots = [];
  }
  const matchingRoot = roots
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
  let entries;
  try {
    entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return '';
  }
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

function countTopLevelVideoFiles(directoryPath) {
  let entries;
  try {
    entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return 0;
  }
  return entries.filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())).length;
}

function resolvePlayableFile(sourcePath, videoUrl) {
  const directVideoPath = resolveFilePathFromVideoUrl(videoUrl);
  if (directVideoPath) {
    try {
      if (fs.statSync(directVideoPath).isFile()) return directVideoPath;
    } catch { /* fall through */ }
  }
  if (!sourcePath || !fs.existsSync(sourcePath)) return '';
  let stat;
  try {
    stat = fs.statSync(sourcePath);
  } catch {
    return '';
  }
  if (stat.isFile()) return sourcePath;
  if (!stat.isDirectory()) return '';
  const preferredName = path.basename(decodePublicPath(videoUrl));
  if (preferredName) {
    const preferredPath = path.join(sourcePath, preferredName);
    try {
      if (fs.existsSync(preferredPath) && fs.statSync(preferredPath).isFile()) return preferredPath;
    } catch { /* fall through */ }
  }
  return findFirstVideoFile(sourcePath);
}

function toPositiveInt(value, fallback) {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return Math.floor(asNumber);
  const match = String(value || '').match(/(\d+)/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return fallback;
}

/**
 * Build the list of transcode targets for an item.
 * Movies → single file. Series → selected episode, or all episodes.
 */
function resolveTargets(item, { season, episode, allEpisodes } = {}) {
  if (!item) {
    const err = new Error('Content not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (item.type === 'movie') {
    return [{
      key: `movie-${item.id}`,
      label: item.title || `Movie ${item.id}`,
      filePath: resolvePlayableFile(item.sourcePath, item.videoUrl),
      videoUrl: item.videoUrl || '',
      sourcePath: item.sourcePath || '',
    }];
  }
  if (item.type === 'series') {
    const seasons = Array.isArray(item.seasons) ? item.seasons : [];
    if (seasons.length === 0) {
      const err = new Error('Series has no seasons/episodes to analyze');
      err.code = 'NO_MEDIA';
      throw err;
    }
    const pickEpisodes = () => {
      if (allEpisodes) {
        const all = [];
        seasons.forEach((s, si) => {
          const eps = Array.isArray(s.episodes) ? s.episodes : [];
          eps.forEach((ep, ei) => {
            all.push({
              season: s, ep,
              seasonNumber: toPositiveInt(s?.number ?? s?.id, si + 1),
              episodeNumber: toPositiveInt(ep?.number ?? ep?.id, ei + 1),
            });
          });
        });
        return all;
      }
      const seasonNumber = toPositiveInt(season, 1);
      const episodeNumber = toPositiveInt(episode, 1);
      const selectedSeason = seasons.find((s, i) => toPositiveInt(s?.number ?? s?.id, i + 1) === seasonNumber)
        || seasons[0];
      const eps = Array.isArray(selectedSeason.episodes) ? selectedSeason.episodes : [];
      const selectedEpisode = eps.find((e, i) => toPositiveInt(e?.number ?? e?.id, i + 1) === episodeNumber)
        || eps[episodeNumber - 1] || eps[0];
      if (!selectedEpisode) {
        const err = new Error('Episode not found');
        err.code = 'NO_MEDIA';
        throw err;
      }
      return [{
        season: selectedSeason,
        ep: selectedEpisode,
        seasonNumber: toPositiveInt(selectedSeason?.number ?? selectedSeason?.id, 1),
        episodeNumber: toPositiveInt(selectedEpisode?.number ?? selectedEpisode?.id, 1),
      }];
    };
    return pickEpisodes().map(({ season: s, ep, seasonNumber, episodeNumber }) => {
      const epSourcePath = ep?.sourcePath || s?.sourcePath || item.sourcePath || '';
      const filePath = resolvePlayableFile(epSourcePath, ep?.videoUrl);
      // Safety: an episode without its own file link that resolves into a
      // directory holding MULTIPLE videos is ambiguous — blindly taking the
      // first file could transcode (and replace) the wrong episode.
      let ambiguous = false;
      if (!ep?.videoUrl && epSourcePath) {
        try {
          if (fs.existsSync(epSourcePath) && fs.statSync(epSourcePath).isDirectory()
            && countTopLevelVideoFiles(epSourcePath) > 1) {
            ambiguous = true;
          }
        } catch { /* ignore */ }
      }
      return {
        key: `series-${item.id}-s${seasonNumber}e${episodeNumber}`,
        label: `${item.title || `Series ${item.id}`} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}${ep?.title ? ` — ${ep.title}` : ''}`,
        filePath: ambiguous ? '' : filePath,
        ambiguous,
        videoUrl: ep?.videoUrl || '',
        sourcePath: epSourcePath,
        seasonNumber,
        episodeNumber,
      };
    });
  }
  const err = new Error(`Unsupported content type: ${item.type}`);
  err.code = 'BAD_TYPE';
  throw err;
}

async function analyzeTarget(target) {
  if (target.ambiguous) {
    return {
      ...target,
      exists: false,
      sizeBytes: 0,
      verdict: 'ambiguous',
      issues: [{ type: 'file', severity: 'warning', message: 'This episode has no direct file link and its folder holds multiple videos — the system cannot tell which file belongs to it. Fix the episode videoUrl (admin → Edit Content) or transcode the file manually.' }],
      video: null,
      audios: [],
    };
  }
  if (!target.filePath) {
    return {
      ...target,
      exists: false,
      sizeBytes: 0,
      verdict: 'file_missing',
      issues: [{ type: 'file', severity: 'error', message: 'Source file not found on server. The file may have been moved — run a re-scan.' }],
      video: null,
      audios: [],
    };
  }
  let stat = null;
  try {
    stat = fs.statSync(target.filePath);
    if (!stat.isFile()) throw new Error('not a file');
  } catch {
    return {
      ...target,
      exists: false,
      sizeBytes: 0,
      verdict: 'file_missing',
      issues: [{ type: 'file', severity: 'error', message: 'Source file not found on server. The file may have been moved — run a re-scan.' }],
      video: null,
      audios: [],
    };
  }
  const probe = await probeMediaFile(target.filePath);
  return { ...target, ...analyzeProbe(target.filePath, probe, stat) };
}

async function analyzeContent(input, options = {}) {
  const key = parseContentInput(input);
  const item = await getItemById(key).catch(() => null);
  if (!item) {
    const err = new Error('Content not found for that link/ID');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const targets = resolveTargets(item, options);
  if (targets.length > 60) {
    const err = new Error(`Too many files (${targets.length}). Pick a single season/episode instead of the whole series.`);
    err.code = 'TOO_MANY';
    throw err;
  }
  const analyzed = [];
  for (const target of targets) {
    analyzed.push(await analyzeTarget(target));
  }
  const counts = { compatible: 0, audio_issue: 0, video_issue: 0, both: 0, unknown: 0, file_missing: 0 };
  analyzed.forEach((t) => { counts[t.verdict] = (counts[t.verdict] || 0) + 1; });
  return {
    item: {
      id: item.id, title: item.title, type: item.type,
      year: item.year, language: item.language, status: item.status,
    },
    options: {
      season: options.season || null, episode: options.episode || null,
      allEpisodes: Boolean(options.allEpisodes),
    },
    summary: counts,
    targets: analyzed,
  };
}

module.exports = {
  PRESETS,
  BROWSER_OK_VIDEO,
  BROWSER_OK_AUDIO,
  probeMediaFile,
  analyzeProbe,
  buildTranscodeArgs,
  parseContentInput,
  resolveTargets,
  resolvePlayableFile,
  analyzeTarget,
  analyzeContent,
  normalizeTranscodeOptions,
  codecDisplayName,
};
