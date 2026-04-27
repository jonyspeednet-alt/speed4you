const path = require('path');

function cleanTitle(name) {
  return String(name || '')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function parseSeasonNumber(seasonName, fallbackNumber) {
  const normalized = cleanTitle(seasonName);
  const seasonMatch = normalized.match(/\bseason\s*(\d{1,3})\b/i)
    || normalized.match(/\bseries\s*(\d{1,3})\b/i)
    || normalized.match(/\bs(\d{1,3})\b/i)
    || normalized.match(/\bs(?:eason)?\s*(\d{1,3})\b/i)
    || normalized.match(/\b(\d{1,3})\b/);
  return seasonMatch ? Number(seasonMatch[1]) : fallbackNumber;
}

function parseEpisodeIdentity(filename) {
  const input = String(filename || '');
  const basename = cleanTitle(path.basename(input, path.extname(input)));

  const seasonEpisodeMatch = basename.match(/\bS(?:eason)?\s*(\d{1,2})\s*[-_. ]*E(?:p(?:isode)?)?\s*(\d{1,3})\b/i)
    || basename.match(/\b(\d{1,2})x(\d{1,3})\b/i)
    || basename.match(/\bS(\d)(\d{2})\b/i)
    || basename.match(/\b(\d{1,2})(\d{2})\b(?=.*\b(?:ep|episode|v\d|finale|1080p|720p|480p)\b)/i);
  if (seasonEpisodeMatch) {
    return {
      season: Number(seasonEpisodeMatch[1]),
      episode: Number(seasonEpisodeMatch[2]),
    };
  }

  const seasonOnlyMatch = basename.match(/\bS(?:eason)?\s*(\d{1,2})\b/i)
    || basename.match(/\b(\d{1,2})x\b/i);
  if (seasonOnlyMatch) {
    return {
      season: Number(seasonOnlyMatch[1]),
      episode: null,
    };
  }

  const episodeOnlyMatch = basename.match(/\bE(?:p(?:isode)?)?\s*(\d{1,3})\b/i)
    || basename.match(/\bEpisode\s*(\d{1,3})\b/i)
    || basename.match(/\[(\d{1,3})\]/)
    || basename.match(/\s*-\s*(\d{1,3})\s*-\s*/)
    || basename.match(/(?:^|[^\d])(?:ep?|episode|part)\s*(\d{1,3})(?:[^\d]|$)/i)
    || basename.match(/(?:^|[^\d])(\d{1,3})(?:[^\d]|$)(?!.*\d)/);
  if (episodeOnlyMatch) {
    return {
      season: null,
      episode: Number(episodeOnlyMatch[1]),
    };
  }

  return {
    season: null,
    episode: null,
  };
}

function sortEpisodeFiles(files = []) {
  return [...files].sort((left, right) => {
    const leftIdentity = parseEpisodeIdentity(left);
    const rightIdentity = parseEpisodeIdentity(right);
    const leftSeason = Number.isFinite(leftIdentity.season) ? leftIdentity.season : Number.MAX_SAFE_INTEGER;
    const rightSeason = Number.isFinite(rightIdentity.season) ? rightIdentity.season : Number.MAX_SAFE_INTEGER;
    const leftEpisode = Number.isFinite(leftIdentity.episode) ? leftIdentity.episode : Number.MAX_SAFE_INTEGER;
    const rightEpisode = Number.isFinite(rightIdentity.episode) ? rightIdentity.episode : Number.MAX_SAFE_INTEGER;

    if (leftSeason !== rightSeason) {
      return leftSeason - rightSeason;
    }
    if (leftEpisode !== rightEpisode) {
      return leftEpisode - rightEpisode;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function parseEpisodeNumber(filename, fallbackNumber) {
  const identity = parseEpisodeIdentity(filename);
  if (Number.isFinite(identity.episode) && identity.episode > 0) {
    return identity.episode;
  }
  return fallbackNumber;
}

function looksLikeSeasonFolder(folderName) {
  const normalized = cleanTitle(folderName).toLowerCase();
  return /\bseason\b/.test(normalized)
    || /^s\d{1,2}$/i.test(String(folderName || '').trim())
    || /^\d{1,2}$/.test(String(folderName || '').trim())
    || /\bspecials?\b/i.test(normalized);
}

function countEpisodeLikeFiles(files = []) {
  const explicitEpisodePatterns = [
    /\bS(?:eason)?\s*\d{1,2}\s*[-_. ]*E(?:p(?:isode)?)?\s*\d{1,3}\b/i,
    /\b\d{1,2}x\d{1,3}\b/i,
    /\bE(?:p(?:isode)?)?\s*\d{1,3}\b/i,
    /\bEpisode\s*\d{1,3}\b/i,
    /\[(\d{1,3})\]/,
  ];

  return files.reduce((count, file) => {
    const normalized = cleanTitle(file);
    if (explicitEpisodePatterns.some((pattern) => pattern.test(normalized))) {
      return count + 1;
    }
    const identity = parseEpisodeIdentity(normalized);
    return Number.isFinite(identity.episode) && identity.episode > 0 ? count + 1 : count;
  }, 0);
}

function hasSequentialEpisodePattern(files = []) {
  const episodeNumbers = files
    .map((file) => parseEpisodeIdentity(file).episode)
    .filter((episode) => Number.isFinite(episode) && episode > 0)
    .sort((left, right) => left - right);

  if (episodeNumbers.length < 2) {
    return false;
  }

  let sequentialPairs = 0;
  for (let index = 1; index < episodeNumbers.length; index += 1) {
    if (episodeNumbers[index] === episodeNumbers[index - 1] + 1) {
      sequentialPairs += 1;
    }
  }
  return sequentialPairs >= 1;
}

function buildEpisodesFromFiles(root, seriesSlug, seasonPath, seasonNumber, files, toPublicUrl) {
  const sortedFiles = sortEpisodeFiles(files);
  const usedEpisodeNumbers = new Set();

  return sortedFiles.map((file, episodeIndex) => {
    let parsedNumber = parseEpisodeNumber(file, episodeIndex + 1);
    if (!Number.isFinite(parsedNumber) || parsedNumber <= 0 || usedEpisodeNumbers.has(parsedNumber)) {
      parsedNumber = episodeIndex + 1;
    }
    usedEpisodeNumbers.add(parsedNumber);

    return {
      id: `${seriesSlug}-${seasonNumber}-${parsedNumber}`,
      number: parsedNumber,
      title: cleanTitle(file),
      videoUrl: toPublicUrl(root, path.join(seasonPath, file)),
      sourcePath: path.join(seasonPath, file),
      duration: '',
    };
  });
}

function buildSeriesSeasons(root, seriesFolderName, seriesPath, options = {}) {
  const {
    listFiles,
    listDirectories,
    listVideoFiles,
    toPublicUrl,
    preferredSeasonLabel = 'Season 1',
  } = options;
  const seriesFiles = listFiles(seriesPath);
  const seasonFolderNames = listDirectories(seriesPath);
  const seasons = [];
  const seriesSlug = slugify(seriesFolderName);

  if (seasonFolderNames.length) {
    for (const [seasonIndex, seasonName] of seasonFolderNames.entries()) {
      const seasonPath = path.join(seriesPath, seasonName);
      const seasonFiles = listFiles(seasonPath);
      const nestedSeasonFolders = listDirectories(seasonPath);
      const directEpisodeFiles = listVideoFiles(seasonFiles, seasonPath, 'series');
      let episodeFiles = directEpisodeFiles;
      let effectiveSeasonPath = seasonPath;

      if (!episodeFiles.length && nestedSeasonFolders.length) {
        const nestedEpisodeFiles = nestedSeasonFolders.flatMap((nestedFolderName) => {
          const nestedPath = path.join(seasonPath, nestedFolderName);
          const nestedFiles = listFiles(nestedPath);
          return listVideoFiles(nestedFiles, nestedPath, 'series').map((file) => ({
            file,
            nestedPath,
          }));
        });
        if (nestedEpisodeFiles.length) {
          episodeFiles = nestedEpisodeFiles.map((entry) => path.relative(seasonPath, path.join(entry.nestedPath, entry.file)));
          effectiveSeasonPath = seasonPath;
        }
      }

      if (!episodeFiles.length) {
        continue;
      }

      const seasonNumber = parseSeasonNumber(seasonName, seasonIndex + 1);
      seasons.push({
        id: `${seriesSlug}-season-${seasonNumber}`,
        number: seasonNumber,
        title: cleanTitle(seasonName),
        sourcePath: seasonPath,
        episodes: buildEpisodesFromFiles(root, seriesSlug, effectiveSeasonPath, seasonNumber, episodeFiles, toPublicUrl),
      });
    }
  }

  if (!seasons.length) {
    const episodeFiles = listVideoFiles(seriesFiles, seriesPath, 'series');
    if (episodeFiles.length) {
      seasons.push({
        id: `${seriesSlug}-season-1`,
        number: 1,
        title: preferredSeasonLabel,
        sourcePath: seriesPath,
        episodes: buildEpisodesFromFiles(root, seriesSlug, seriesPath, 1, episodeFiles, toPublicUrl),
      });
    }
  }

  return {
    seasons: mergeDuplicateSeasons(seasons),
    seriesFiles,
  };
}

function mergeDuplicateSeasons(seasons = []) {
  const grouped = new Map();

  for (const season of seasons) {
    const seasonNumber = Number(season?.number || 0) || 1;
    const current = grouped.get(seasonNumber);
    if (!current) {
      grouped.set(seasonNumber, {
        ...season,
        number: seasonNumber,
        episodes: Array.isArray(season?.episodes) ? [...season.episodes] : [],
      });
      continue;
    }

    const seenEpisodeKeys = new Set(
      (current.episodes || []).map((episode) => `${Number(episode?.number || 0)}::${String(episode?.sourcePath || '')}`),
    );
    const mergedEpisodes = [...(current.episodes || [])];
    for (const episode of season.episodes || []) {
      const key = `${Number(episode?.number || 0)}::${String(episode?.sourcePath || '')}`;
      if (!seenEpisodeKeys.has(key)) {
        seenEpisodeKeys.add(key);
        mergedEpisodes.push(episode);
      }
    }

    grouped.set(seasonNumber, {
      ...current,
      title: current.title || season.title,
      sourcePath: current.sourcePath || season.sourcePath,
      episodes: sortEpisodesWithinSeason(mergedEpisodes),
    });
  }

  return [...grouped.values()].sort((left, right) => left.number - right.number);
}

function sortEpisodesWithinSeason(episodes = []) {
  return [...episodes].sort((left, right) => {
    const leftNumber = Number(left?.number || 0) || Number.MAX_SAFE_INTEGER;
    const rightNumber = Number(right?.number || 0) || Number.MAX_SAFE_INTEGER;
    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
    return String(left?.sourcePath || '').localeCompare(String(right?.sourcePath || ''), undefined, { numeric: true, sensitivity: 'base' });
  });
}

module.exports = {
  buildSeriesSeasons,
  cleanTitle,
  countEpisodeLikeFiles,
  hasSequentialEpisodePattern,
  looksLikeSeasonFolder,
  parseEpisodeIdentity,
  parseSeasonNumber,
  slugify,
  sortEpisodeFiles,
};
