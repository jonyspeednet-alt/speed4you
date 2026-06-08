const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/database');
const { updateItem } = require('../src/data/store');

async function run() {
  console.log('Loading current scanner roots and their categories...');
  const rootsResult = await db.query('SELECT id, category FROM scanner_roots');
  const rootCategories = new Map();
  for (const row of rootsResult.rows) {
    if (row.category) {
      rootCategories.set(row.id, row.category);
    }
  }

  console.log('Roots configuration:', Object.fromEntries(rootCategories));

  console.log('Querying items with "Auto Movies" or blank category...');
  const queryResult = await db.query(
    "SELECT id, payload FROM content_catalog WHERE category = 'Auto Movies' OR COALESCE(category, '') = '' ORDER BY id"
  );

  console.log('Found ' + queryResult.rows.length + ' items to update.');

  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < queryResult.rows.length; i++) {
    const row = queryResult.rows[i];
    const item = row.payload;
    if (!item) continue;

    const rootId = item.sourceRootId || item.source_root_id;
    const targetCategory = rootCategories.get(rootId);

    if (targetCategory && targetCategory !== 'Auto Movies') {
      const updatedPayload = Object.assign({}, item, {
        category: targetCategory
      });

      await updateItem(row.id, updatedPayload);
      updatedCount++;

      if (updatedCount % 200 === 0) {
        console.log('Updated ' + updatedCount + ' / ' + queryResult.rows.length + ' items...');
      }
    } else {
      skippedCount++;
    }
  }

  console.log('Done! Updated: ' + updatedCount + ' | Skipped (no matching root category or remains Auto Movies): ' + skippedCount);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
