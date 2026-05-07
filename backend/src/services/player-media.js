const { spawn } = require('child_process');
const { FFMPEG_BIN, FFPROBE_BIN } = require('../config/player-cache');

const UNIVERSAL_TARGET = 'mp4-h264-aac-faststart';
const DIRECT_PLAY_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm']);
const CONTENT_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.ts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
};

const SUPPORTED_VIDEO_EXTENSIONS = new Set(Object.keys(CONTENT_TYPES));

function createStrategyFallback(reason, profile = null) {
  return {
    mode: 'transcode',
    videoCodec: profile?.videoCodec || '',
    audioCodec: profile?.audioCodec || '',
    reason,
    universalTarget: UNIVERSAL_TARGET,
    profile,
  };
}

function runCommand(bin, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    const timeoutMs = Number(options.timeoutMs || 0);
    let timer = null;
    let timedOut = false;

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);
    }

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (timer) {
        clearTimeout(timer);
      }

      if (timedOut) {
        reject(new Error(`${bin} timed out after ${timeoutMs}ms`));
        return;
      }

      if (code !== 0) {
        reject(new Error(Buffer.concat(stderr).toString('utf8') || `${bin} exited with code ${code}`));
        return;
      }

      resolve(Buffer.concat(stdout).toString('utf8'));
    });
  });
}

async function probeMedia(resolvedPath, options = {}) {
  const raw = await runCommand(options.ffprobeBin || FFPROBE_BIN, [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    resolvedPath,
  ], { timeoutMs: Number(options.timeoutMs || 0) });

  return JSON.parse(raw);
}

function findPrimaryStream(streams, codecType) {
  const typed = (streams || []).filter((stream) => stream.codec_type === codecType);
  if (!typed.length) {
    return null;
  }

  return [...typed].sort((left, right) => {
    const leftDefault = Number(left?.disposition?.default || 0);
    const rightDefault = Number(right?.disposition?.default || 0);
    if (leftDefault !== rightDefault) {
      return rightDefault - leftDefault;
    }

    const leftDuration = Number(left?.duration || 0);
    const rightDuration = Number(right?.duration || 0);
    if (Number.isFinite(leftDuration) && Number.isFinite(rightDuration) && leftDuration !== rightDuration) {
      return rightDuration - leftDuration;
    }

    return Number(left?.index || 0) - Number(right?.index || 0);
  })[0];
}

function collectPlaybackProfile(probeData, extension) {
  const streams = Array.isArray(probeData?.streams) ? probeData.streams : [];
  const formatNames = String(probeData?.format?.format_name || '')
    .toLowerCase()
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const videoStream = findPrimaryStream(streams, 'video');
  const audioStreams = streams.filter((stream) => stream.codec_type === 'audio');
  const audioStream = findPrimaryStream(streams, 'audio');
  const subtitleStreams = streams.filter((stream) => stream.codec_type === 'subtitle');
  const videoCodec = String(videoStream?.codec_name || '').toLowerCase();
  const audioCodec = String(audioStream?.codec_name || '').toLowerCase();
  const pixelFormat = String(videoStream?.pix_fmt || '').toLowerCase();
  const videoProfile = String(videoStream?.profile || '').toLowerCase();
  const bitDepth = Number(videoStream?.bits_per_raw_sample || videoStream?.bits_per_sample || 8);
  const isTenBit = bitDepth > 8 || pixelFormat.includes('10');
  const hasHdrSignal = ['smpte2084', 'arib-std-b67'].includes(String(videoStream?.color_transfer || '').toLowerCase());
  const oddSubtitleCodecs = subtitleStreams
    .map((stream) => String(stream?.codec_name || '').toLowerCase())
    .filter((codec) => codec && !['mov_text', 'webvtt'].includes(codec));
  const hasOddSubtitleCodec = oddSubtitleCodecs.length > 0;
  const isMp4Family = formatNames.some((value) => value === 'mp4' || value === 'mov');
  const isWebmFamily = formatNames.includes('webm');
  const mp4FriendlyVideo = ['h264', 'avc1'].includes(videoCodec) && !isTenBit && !hasHdrSignal && (!pixelFormat || pixelFormat === 'yuv420p');
  const mp4FriendlyAudio = ['aac', 'mp4a'].includes(audioCodec) || !audioCodec;
  const canDirectPlayMp4 = DIRECT_PLAY_EXTENSIONS.has(extension) && isMp4Family && mp4FriendlyVideo && mp4FriendlyAudio && audioStreams.length <= 1;
  const canDirectPlayWebm = extension === '.webm'
    && isWebmFamily
    && ['vp8', 'vp9', 'av1'].includes(videoCodec)
    && ['opus', 'vorbis'].includes(audioCodec)
    && audioStreams.length <= 1;

  return {
    extension,
    formatNames,
    videoCodec,
    audioCodec: audioCodec || '(none)',
    pixelFormat,
    videoProfile,
    bitDepth: Number.isFinite(bitDepth) ? bitDepth : 8,
    audioStreamCount: audioStreams.length,
    subtitleStreamCount: subtitleStreams.length,
    hasOddSubtitleCodec,
    isTenBit,
    hasHdrSignal,
    canDirectPlayMp4,
    canDirectPlayWebm,
    mp4FriendlyVideo,
    mp4FriendlyAudio,
    oddSubtitleCodecs,
    hasVideo: Boolean(videoStream),
    hasAudio: Boolean(audioStream),
  };
}

function pickStreamingStrategy(probeData, extension) {
  const profile = collectPlaybackProfile(probeData, extension);

  if (!profile.hasVideo) {
    return createStrategyFallback('missing playable video stream', profile);
  }

  if (profile.canDirectPlayMp4 || profile.canDirectPlayWebm) {
    return {
      mode: 'direct',
      videoCodec: profile.videoCodec,
      audioCodec: profile.audioCodec,
      reason: 'browser-safe direct play',
      universalTarget: UNIVERSAL_TARGET,
      profile,
    };
  }

  if (profile.mp4FriendlyVideo && profile.mp4FriendlyAudio) {
    return {
      mode: 'remux-copy',
      videoCodec: profile.videoCodec,
      audioCodec: profile.audioCodec,
      reason: 'container-only normalization',
      universalTarget: UNIVERSAL_TARGET,
      profile,
    };
  }

  if (profile.mp4FriendlyVideo) {
    return {
      mode: 'copy-video-transcode-audio',
      videoCodec: profile.videoCodec,
      audioCodec: profile.audioCodec,
      reason: 'audio normalization required',
      universalTarget: UNIVERSAL_TARGET,
      profile,
    };
  }

  return createStrategyFallback('universal compatibility fallback', profile);
}

async function determineStreamingStrategy(resolvedPath, extension, options = {}) {
  if (!resolvedPath) {
    return createStrategyFallback('missing source path');
  }

  try {
    return pickStreamingStrategy(await probeMedia(resolvedPath, options), extension);
  } catch (error) {
    if (typeof options.onError === 'function') {
      options.onError(error);
    } else {
      logger.error('Player error: ' + (error?.message || error));
    }

    return createStrategyFallback('probe failed, using universal fallback');
  }
}


function getUniversalTranscodeArgs(outputTarget) {
  return [
    '-c:v', 'libx264',
    '-preset', process.env.PLAYER_TRANSCODE_PRESET || 'veryfast',
    '-crf', process.env.PLAYER_TRANSCODE_CRF || '23',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.1',
    '-c:a', 'aac',
    '-b:a', process.env.PLAYER_AUDIO_BITRATE || '160k',
    ...outputTarget,
  ];
}

function getFfmpegFileArgs(resolvedPath, outputPath, strategyMode) {
  const common = [
    '-y',
    '-v', 'error',
    '-fflags', '+discardcorrupt+genpts',
    '-err_detect', 'ignore_err',
    '-i', resolvedPath,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-sn',
    '-dn',
  ];

  if (strategyMode === 'remux-copy') {
    return [
      ...common,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ];
  }

  if (strategyMode === 'copy-video-transcode-audio') {
    return [
      ...common,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', process.env.PLAYER_AUDIO_BITRATE || '160k',
      '-movflags', '+faststart',
      outputPath,
    ];
  }

  return [
    ...common,
    ...getUniversalTranscodeArgs([
      '-movflags', '+faststart',
      outputPath,
    ]),
  ];
}

module.exports = {
  UNIVERSAL_TARGET,
  DIRECT_PLAY_EXTENSIONS,
  CONTENT_TYPES,
  SUPPORTED_VIDEO_EXTENSIONS,
  FFMPEG_BIN,
  FFPROBE_BIN,
  runCommand,
  probeMedia,
  findPrimaryStream,
  collectPlaybackProfile,
  pickStreamingStrategy,
  determineStreamingStrategy,
  getUniversalTranscodeArgs,
  getFfmpegFileArgs,
};
