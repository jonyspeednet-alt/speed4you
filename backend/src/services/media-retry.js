const fs = require('fs');
const { getItemById } = require('../data/store');
const { resolveTargets, analyzeTarget } = require('./media-compat');

// Historical jobs remain retryable after catalog cleanup/rematching. Only use
// their recorded exact source file, never a directory's first video.
async function resolveRetry(record) {
  let item = record.itemId ? await getItemById(record.itemId) : null;
  let target;
  if (record.sourcePath) {
    try {
      if (fs.statSync(record.sourcePath).isFile()) {
        target = {
          key: record.targetKey, label: record.targetLabel || record.itemTitle,
          filePath: record.sourcePath, sourcePath: record.sourcePath,
          seasonNumber: record.season, episodeNumber: record.episode,
        };
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!target && item) {
    const targets = resolveTargets(item, { allEpisodes: item.type === 'series' });
    target = targets.find((t) => t.key === record.targetKey);
  }
  if (!target) {
    const error = new Error('The original file is missing and this job has no matching catalog target. Rescan the content, then analyze its new link.');
    error.code = 'NO_MEDIA';
    throw error;
  }
  item = item || { id: record.itemId, title: record.itemTitle || record.targetLabel };
  const analysis = await analyzeTarget(target);
  if (!analysis.exists) {
    const error = new Error('Source file is missing. Rescan the content before retrying.');
    error.code = 'NO_MEDIA';
    throw error;
  }
  return { item, target, analysis };
}

module.exports = { resolveRetry };
