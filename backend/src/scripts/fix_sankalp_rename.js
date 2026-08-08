/**
 * fix_sankalp_rename.js
 * Fixes Sankal.mkv back to Sankalp.mkv and checks any other real 'p' word filenames.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function fixSankalp() {
  const rootPath = '/var/www/html/Requested/Movies';
  const badPath = path.join(rootPath, 'Sankal.mkv');
  const goodPath = path.join(rootPath, 'Sankalp.mkv');

  if (fs.existsSync(badPath) && !fs.existsSync(goodPath)) {
    fs.renameSync(badPath, goodPath);
    console.log(`✓ Renamed "${badPath}" -> "${goodPath}"`);

    await query(`
      UPDATE content_catalog
      SET title = 'Sankalp',
          payload = jsonb_set(
            jsonb_set(payload, '{title}', '"Sankalp"'),
            '{sourcePath}', to_jsonb($2::text)
          )
      WHERE payload->>'sourcePath' = $1
    `, [badPath, goodPath]);
    console.log('✓ Updated DB for Sankalp.');
  }

  process.exit(0);
}

fixSankalp().catch(console.error);
