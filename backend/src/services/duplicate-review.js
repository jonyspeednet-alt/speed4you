const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadScannerRoots } = require('../data/store');

const DUPLICATE_HOLD_DIR_NAME = process.env.MEDIA_NORMALIZER_DUPLICATE_DIR || '_duplicate_hold';
const SAMPLE_HASH_BYTES = 1024 * 1024;

function normalizeTitleKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\b(1080p|720p|480p|2160p|web[- ]?dl|bluray|brrip|x264|x265|hdrip|dvdrip|proper|uncut)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDuplicateDecorators(value) {
  return String(value || '')
    .replace(/\.preexisting-duplicate$/i, '')
    .replace(/\.duplicate$/i, '')
    .replace(/\s+\(\d+\)$/i, '')
    .trim();
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function hashFileSample(filePath) {
  const stat = fs.statSync(filePath);
  const hash = crypto.createHash('sha1');
  const fd = fs.openSync(filePath, 'r');

  try {
    const chunkSize = Math.min(SAMPLE_HASH_BYTES, stat.size || SAMPLE_HASH_BYTES);
    const buffer = Buffer.alloc(chunkSize);
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, 0);
    hash.update(buffer.subarray(0, bytesRead));

    if (stat.size > SAMPLE_HASH_BYTES) {
      const tailOffset = Math.max(0, stat.size - SAMPLE_HASH_BYTES);
      const tailBuffer = Buffer.alloc(Math.min(SAMPLE_HASH_BYTES, stat.size));
      const tailBytes = fs.readSync(fd, tailBuffer, 0, tailBuffer.length, tailOffset);
      hash.update(tailBuffer.subarray(0, tailBytes));
    }
  } finally {
    fs.closeSync(fd);
  }

  return hash.digest('hex');
}

function compareFiles(leftPath, rightPath) {
  const leftStat = fs.statSync(leftPath);
  const rightStat = fs.statSync(rightPath);

  if (leftStat.size !== rightStat.size) {
    return { exact: false, reason: 'size-mismatch' };
  }

  const leftHash = hashFileSample(leftPath);
  const rightHash = hashFileSample(rightPath);
  return {
    exact: leftHash === rightHash,
    reason: leftHash === rightHash ? 'sample-hash-match' : 'content-mismatch',
    size: leftStat.size,
  };
}

function listDuplicateHoldCandidates() {
  const roots = loadScannerRoots();
  const results = [];

  for (const root of roots) {
    if (!root?.scanPath || !fs.existsSync(root.scanPath)) {
      continue;
    }

    const queue = [root.scanPath];
    while (queue.length) {
      const current = queue.shift();
      let entries = [];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const absolutePath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === DUPLICATE_HOLD_DIR_NAME) {
            let holdEntries = [];
            try {
              holdEntries = fs.readdirSync(absolutePath, { withFileTypes: true });
            } catch {
              holdEntries = [];
            }

            for (const holdEntry of holdEntries) {
              if (!holdEntry.isFile()) {
                continue;
              }

              const heldPath = path.join(absolutePath, holdEntry.name);
              const parsed = path.parse(holdEntry.name);
              const candidateBase = stripDuplicateDecorators(parsed.name);
              const targetPath = path.join(current, `${candidateBase}${parsed.ext}`);
              const heldStat = fs.statSync(heldPath);
              const targetExists = fileExists(targetPath);
              const targetStat = targetExists ? fs.statSync(targetPath) : null;
              const compare = targetExists ? compareFiles(heldPath, targetPath) : { exact: false, reason: 'target-missing' };

              results.push({
                rootId: root.id,
                rootLabel: root.label,
                holdDir: absolutePath,
                heldPath,
                targetPath,
                targetExists,
                relativeHeldPath: path.relative(root.scanPath, heldPath).split(path.sep).join('/'),
                relativeTargetPath: targetExists ? path.relative(root.scanPath, targetPath).split(path.sep).join('/') : '',
                titleKey: normalizeTitleKey(candidateBase),
                size: heldStat.size,
                targetSize: targetStat?.size || 0,
                exactDuplicate: Boolean(compare.exact),
                compareReason: compare.reason,
                modifiedAt: heldStat.mtime.toISOString(),
              });
            }
            continue;
          }

          queue.push(absolutePath);
        }
      }
    }
  }

  results.sort((left, right) => new Date(right.modifiedAt) - new Date(left.modifiedAt));
  return results;
}

function getDuplicateReviewReport() {
  const items = listDuplicateHoldCandidates();
  return {
    generatedAt: new Date().toISOString(),
    holdDirName: DUPLICATE_HOLD_DIR_NAME,
    totalItems: items.length,
    exactDuplicates: items.filter((item) => item.exactDuplicate).length,
    pendingReview: items.filter((item) => !item.exactDuplicate).length,
    items,
  };
}

function runDuplicateCleanup(options = {}) {
  const report = getDuplicateReviewReport();
  const dryRun = options.dryRun === true;
  const onlyPaths = new Set(
    (Array.isArray(options.onlyPaths) ? options.onlyPaths : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean),
  );

  const candidates = report.items.filter((item) => {
    if (!item.exactDuplicate) return false;
    if (onlyPaths.size && !onlyPaths.has(item.heldPath)) return false;
    return true;
  });

  const deleted = [];
  const failed = [];
  const skipped = report.totalItems - candidates.length;

  for (const item of candidates) {
    if (dryRun) {
      deleted.push({ ...item, dryRun: true });
      continue;
    }

    try {
      fs.unlinkSync(item.heldPath);
      deleted.push(item);
    } catch (error) {
      failed.push({
        ...item,
        error: error.message,
      });
    }
  }

  return {
    completedAt: new Date().toISOString(),
    inspected: report.totalItems,
    candidates: candidates.length,
    deletedCount: dryRun ? 0 : deleted.length,
    dryRunDeletedCount: dryRun ? deleted.length : 0,
    failedCount: failed.length,
    skipped,
    pendingReview: report.items.filter((item) => !item.exactDuplicate).length,
    dryRun,
    deleted,
    failed,
  };
}

/**
 * DB-driven duplicate review (cross-root scanner items, manual-vs-scanner conflicts).
 * Returns duplicate groups sorted by group size then by last updated.
 */
async function getCatalogDuplicateGroups({ db, limit = 100, minGroupSize = 2 } = {}) {
  if (!db) {
    throw new Error('db handle required for getCatalogDuplicateGroups');
  }
  const result = await db.query(
    `SELECT content_type, title_key, COUNT(*)::int AS group_size,
            MAX(duplicate_count) AS max_duplicate_count,
            MAX(updated_at) AS last_updated
     FROM content_catalog
     WHERE duplicate_count > 0
     GROUP BY content_type, title_key
     HAVING COUNT(*) >= $1
     ORDER BY group_size DESC, last_updated DESC
     LIMIT $2`,
    [Math.max(1, Number(minGroupSize) || 2), Math.max(1, Number(limit) || 100)],
  );
  if (!result.rows.length) {
    return { generatedAt: new Date().toISOString(), totalGroups: 0, groups: [] };
  }
  const groups = [];
  for (const row of result.rows) {
    const membersResult = await db.query(
      `SELECT id, payload, duplicate_count, status, source_type, source_root_id
       FROM content_catalog
       WHERE content_type = $1 AND title_key = $2
       ORDER BY id ASC`,
      [row.content_type, row.title_key],
    );
    groups.push({
      contentType: row.content_type,
      titleKey: row.title_key,
      groupSize: Number(row.group_size || 0),
      maxDuplicateCount: Number(row.max_duplicate_count || 0),
      lastUpdated: row.last_updated,
      members: membersResult.rows.map((m) => {
        const payload = m.payload || {};
        return {
          id: Number(m.id),
          title: payload.title || '',
          type: m.content_type,
          status: m.status,
          sourceType: m.source_type,
          sourceRootId: m.source_root_id || '',
          sourceRootLabel: payload.sourceRootLabel || payload.source_root_label || '',
          sourcePath: payload.sourcePath || '',
          year: payload.year || null,
          rating: payload.rating || null,
          runtime: payload.runtime || payload.runtimeMinutes || null,
          createdAt: payload.createdAt || '',
          updatedAt: payload.updatedAt || '',
          duplicateCount: Number(m.duplicate_count || 0),
        };
      }),
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    totalGroups: groups.length,
    groups,
  };
}

module.exports = {
  getDuplicateReviewReport,
  runDuplicateCleanup,
  getCatalogDuplicateGroups,
};
