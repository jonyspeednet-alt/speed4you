const fs = require('fs');
const path = require('path');
const {
  PLAYER_CACHE_ROOT,
  PLAYER_CACHE_READY_MIN_BYTES,
  ensurePlayerCacheRoot,
  isCacheReadyStat,
} = require('../src/config/player-cache');

function parseArgs(argv) {
  const options = {
    report: false,
    dryRun: false,
    removeStalePartials: false,
    partialHours: 12,
    deleteOlderThanDays: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report') {
      options.report = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--remove-stale-partials') {
      options.removeStalePartials = true;
      continue;
    }
    if (arg === '--partial-hours' && argv[index + 1]) {
      options.partialHours = Number(argv[index + 1]) || options.partialHours;
      index += 1;
      continue;
    }
    if (arg === '--delete-older-than-days' && argv[index + 1]) {
      options.deleteOlderThanDays = Number(argv[index + 1]) || 0;
      index += 1;
    }
  }

  if (!options.report && !options.removeStalePartials && options.deleteOlderThanDays <= 0) {
    options.report = true;
  }

  return options;
}

function walkFiles(rootDir) {
  const files = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  }

  return files;
}

function toGb(bytes) {
  return Number((bytes / (1024 ** 3)).toFixed(2));
}

function collectStats(files) {
  const now = Date.now();
  const summary = {
    root: PLAYER_CACHE_ROOT,
    readyMinBytes: PLAYER_CACHE_READY_MIN_BYTES,
    totalFiles: 0,
    readyFiles: 0,
    partialFiles: 0,
    otherFiles: 0,
    readyBytes: 0,
    partialBytes: 0,
    otherBytes: 0,
    oldestReadyAgeHours: 0,
    newestReadyAgeHours: 0,
    oldestPartialAgeHours: 0,
  };

  for (const absolutePath of files) {
    const stat = fs.statSync(absolutePath);
    const ageHours = Number(((now - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2));

    summary.totalFiles += 1;

    if (absolutePath.endsWith('.part.mp4')) {
      summary.partialFiles += 1;
      summary.partialBytes += stat.size;
      summary.oldestPartialAgeHours = Math.max(summary.oldestPartialAgeHours, ageHours);
      continue;
    }

    if (isCacheReadyStat(stat)) {
      summary.readyFiles += 1;
      summary.readyBytes += stat.size;
      summary.oldestReadyAgeHours = Math.max(summary.oldestReadyAgeHours, ageHours);
      summary.newestReadyAgeHours = summary.newestReadyAgeHours === 0
        ? ageHours
        : Math.min(summary.newestReadyAgeHours, ageHours);
      continue;
    }

    summary.otherFiles += 1;
    summary.otherBytes += stat.size;
  }

  return summary;
}

function removeFile(targetPath, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] delete ${targetPath}`);
    return;
  }

  fs.unlinkSync(targetPath);
  console.log(`deleted ${targetPath}`);
}

function removeStalePartials(files, options) {
  const cutoffMs = Date.now() - (options.partialHours * 60 * 60 * 1000);
  let removed = 0;

  for (const absolutePath of files) {
    if (!absolutePath.endsWith('.part.mp4')) {
      continue;
    }

    const stat = fs.statSync(absolutePath);
    if (stat.mtimeMs > cutoffMs) {
      continue;
    }

    removeFile(absolutePath, options.dryRun);
    removed += 1;
  }

  return removed;
}

function deleteOldReadyFiles(files, options) {
  if (options.deleteOlderThanDays <= 0) {
    return 0;
  }

  const cutoffMs = Date.now() - (options.deleteOlderThanDays * 24 * 60 * 60 * 1000);
  let removed = 0;

  for (const absolutePath of files) {
    if (absolutePath.endsWith('.part.mp4')) {
      continue;
    }

    const stat = fs.statSync(absolutePath);
    if (!isCacheReadyStat(stat) || stat.mtimeMs > cutoffMs) {
      continue;
    }

    removeFile(absolutePath, options.dryRun);
    removed += 1;
  }

  return removed;
}

function printReport(summary) {
  console.log(`Cache root: ${summary.root}`);
  console.log(`Ready threshold: ${summary.readyMinBytes} bytes`);
  console.log(`Files: total=${summary.totalFiles}, ready=${summary.readyFiles}, partial=${summary.partialFiles}, other=${summary.otherFiles}`);
  console.log(`Storage: ready=${toGb(summary.readyBytes)} GB, partial=${toGb(summary.partialBytes)} GB, other=${toGb(summary.otherBytes)} GB`);
  console.log(`Ready age: newest=${summary.newestReadyAgeHours}h, oldest=${summary.oldestReadyAgeHours}h`);
  console.log(`Oldest partial age: ${summary.oldestPartialAgeHours}h`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  ensurePlayerCacheRoot();
  const files = walkFiles(PLAYER_CACHE_ROOT);

  if (options.removeStalePartials) {
    const removedPartials = removeStalePartials(files, options);
    console.log(`stale partials removed: ${removedPartials}`);
  }

  if (options.deleteOlderThanDays > 0) {
    const removedReady = deleteOldReadyFiles(files, options);
    console.log(`old ready cache files removed: ${removedReady}`);
  }

  if (options.report) {
    const freshFiles = walkFiles(PLAYER_CACHE_ROOT);
    printReport(collectStats(freshFiles));
  }
}

main();
