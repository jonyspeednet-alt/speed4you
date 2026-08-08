/**
 * inspect_1000_babies_folder.js
 * Inspects real folder on disk and cleans scanSignatures for 1000 Babies
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function inspectFolder() {
  const targetDir = '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/1000 Babies';

  console.log(`=== INSPECTING DISK DIRECTORY: ${targetDir} ===`);
  if (!fs.existsSync(targetDir)) {
    console.log('❌ Directory does not exist on disk!');
    process.exit(1);
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  console.log(`Found ${entries.length} items on disk inside 1000 Babies:`);
  entries.forEach(e => {
    console.log(`  - [${e.isDirectory() ? 'DIR' : 'FILE'}] ${e.name}`);
  });

  // Check what scanSignature should be
  const expectedSignature = `tv-series-a-e:1000 Babies`;
  console.log(`\nExpected scanSignature: "${expectedSignature}"`);

  // Check if any row in content_catalog has this exact scanSignature
  const sigMatch = await query(`
    SELECT id, title, status, payload->>'scanSignature' AS sig, payload->>'sourcePath' AS sp
    FROM content_catalog
    WHERE payload->>'scanSignature' = $1
  `, [expectedSignature]);

  console.log(`Matching rows with scanSignature "${expectedSignature}": ${sigMatch.rows.length}`);
  sigMatch.rows.forEach(r => console.log(`  ID:${r.id} title:"${r.title}" status:${r.status} sp:"${r.sp}"`));

  process.exit(0);
}

inspectFolder().catch(console.error);
