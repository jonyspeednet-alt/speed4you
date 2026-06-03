const { ensureContentStore } = require('../data/store/base');
const { normalizeTitleKey } = require('../data/store/helpers');

async function migrate() {
  await ensureContentStore();
  const content = require('../data/store/content');

  console.log('Reading all catalog items...');
  const allItems = await content.listItems({}, 0, null, 'latest', false);
  const items = allItems.items || [];
  console.log(`Total items: ${items.length}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    try {
      const newKey = normalizeTitleKey(item.title, item.year);
      if (newKey === item.title_key || newKey === item.titleKey) {
        skipped++;
        continue;
      }
      await content.updateItem(item.id, { titleKey: newKey });
      updated++;
      if (updated % 200 === 0) console.log(`  Updated ${updated}...`);
    } catch (e) {
      console.error(`  Error on item ${item.id}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nUpdated: ${updated}`);
  console.log(`Skipped (same): ${skipped}`);
  console.log(`Errors: ${errors}`);

  console.log('\nRecalculating duplicate counts...');
  const result = await content.recalculateDuplicateCounts();
  console.log(`Updated ${result.updated} of ${result.total} items`);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
