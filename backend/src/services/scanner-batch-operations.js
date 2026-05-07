const { upsertScannedItem, deleteScannerItemsNotInSignatures } = require('../data/store');

async function runLimited(items, worker, concurrency = 5) {
  const results = [];
  let index = 0;

  async function next() {
    const currentIndex = index;
    index += 1;
    if (currentIndex >= items.length) return;
    results[currentIndex] = await worker(items[currentIndex], currentIndex);
    await next();
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, next);
  await Promise.all(workers);
  return results;
}

async function batchUpsertScannerItems(items, options = {}) {
  const input = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!input.length) {
    return { created: 0, updated: 0, unchanged: 0, items: [], errors: [] };
  }

  const result = { created: 0, updated: 0, unchanged: 0, items: [], errors: [] };
  const concurrency = Math.max(1, Number(options.concurrency || 4));

  await runLimited(input, async (item, index) => {
    try {
      const saved = await upsertScannedItem(item);
      if (saved.created) result.created += 1;
      else if (saved.updated) result.updated += 1;
      else result.unchanged += 1;
      result.items.push(saved.item);
    } catch (error) {
      result.errors.push({ index, scanSignature: item.scanSignature || '', error: error.message });
    }
  }, concurrency);

  return result;
}

async function batchDeleteScannerItemsNotInSignatures(sourceRootId, scanSignatures = []) {
  return deleteScannerItemsNotInSignatures(sourceRootId, scanSignatures);
}

async function batchPublishScannerItems() {
  throw new Error('batchPublishScannerItems is intentionally disabled; use the admin publish workflow to preserve moderation controls.');
}

module.exports = {
  batchUpsertScannerItems,
  batchDeleteScannerItemsNotInSignatures,
  batchPublishScannerItems,
};
