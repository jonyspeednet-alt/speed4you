require('dotenv').config();

const { ensureContentStore, listItems, saveScannerRoots, loadScannerRoots } = require('../src/data/store');
const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function main() {
  await ensureContentStore();

  // Seed scanner roots from new_roots.json if scanner_roots is currently empty
  const rootsPath = path.resolve(__dirname, '../../new_roots.json');
  if (fs.existsSync(rootsPath)) {
    const existingRoots = loadScannerRoots();
    if (!existingRoots || existingRoots.length === 0) {
      console.log('Seeding scanner roots from new_roots.json...');
      try {
        const roots = JSON.parse(fs.readFileSync(rootsPath, 'utf8'));
        await saveScannerRoots(roots);
        console.log(`Successfully seeded ${roots.length} scanner roots.`);
      } catch (err) {
        console.error('Failed to seed scanner roots:', err.message);
      }
    }
  }

  const { items, total } = await listItems({}, 0, 1);
  const sampleId = items[0]?.id || null;

  console.log(JSON.stringify({
    ok: true,
    database: process.env.DB_NAME || 'isp_entertainment',
    totalItems: total,
    sampleId,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.closePool().catch(() => {});
  });

