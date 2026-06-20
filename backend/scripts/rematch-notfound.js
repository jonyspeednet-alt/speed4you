require('dotenv').config();
const { enrichItemWithMetadata } = require('../src/services/scanner-enhanced-metadata');
const { cleanSearchTitle } = require('../src/services/metadata-enricher');
const { query } = require('../src/config/database');

async function rematch(id, customTitle) {
  const row = await query('SELECT payload FROM content_catalog WHERE id = $1', [id]);
  if (!row.rows.length) return;
  const item = row.rows[0].payload;
  const oldTitle = item.title;
  // Use custom title if provided, otherwise keep original (cleanSearchTitle inside enrichItemWithMetadata does the cleaning)
  const newTitle = customTitle || oldTitle;
  const enriched = await enrichItemWithMetadata({ ...item, title: newTitle });
  if (enriched.metadataStatus === 'matched') {
    await query(
      `UPDATE content_catalog SET payload = $2::jsonb, metadata_status = 'matched', title = $3, updated_at = NOW() WHERE id = $1`,
      [id, JSON.stringify({ ...item, ...enriched, title: newTitle }), newTitle]
    );
    console.log(`✅ ID=${id}: "${oldTitle}" → matched`);
  } else {
    console.log(`❌ ID=${id}: "${oldTitle}" still ${enriched.metadataStatus}`);
  }
}

async function main() {
  // Items that need cleaner titles (with properly cleaned versions)
  const manual = {
    20802: 'Baadshah',            // Baadshah 1999 Hindi DvDrip...
    20808: 'Once Upon a Time in Hollywood', // Once Upon.a Time In Hollywood 2019 1080p...
    3971:  'The Hearts of the Down Under and My Son',
    14141: 'Cha Garam',
    14151: 'Ishtangaa Icche Ghuri',
    14167: 'Pushpa 2: The Rule',  // Pushpa 2 The Rule Reloaded Version (2025) Bengali Dubbed
    14185: 'Swapnabaj',
    14195: 'Velaikkaran',         // Velaikkaran Leader (2023)
    14213: 'Next Door Neighbor',
    14253: 'Aschorjo Prodip',
    14266: 'Tarkata',
    14276: 'Anil Bagchir Ekdin',
    14286: 'Parbona Ami Charte Toke',
    14291: 'Pipra Bidya',
    14464: 'Herey Jabar Golpo',
    14485: 'Khachar Bhetor Ochin Pakhi',
    14830: 'Titas Ekti Nadir Naam',
    14874: 'Heerak Rajar Deshe',
    14940: 'Geet Sangeet',
    14973: 'Ambar Sen Antardhan Rahasya',
    15155: 'Sob Charitro Kalponik',
    15712: 'Mishawr Rawhoshyo',
    16182: 'Bheetu',
    16406: 'Sudhu Tomari Jonno',
    16751: 'Saheb Bibi Golaam',
    18010: 'Basu Poribar',
    18037: 'Bhobishyoter Bhoot',
    19450: 'Urojahaj',
    19715: 'Hobu Chandra Raja Gobu Chandra Montri',
    20086: '812 Binay Badal Dinesh',
    20499: 'Toke Chhara Banchbo Naa',
    20563: 'Archier Gallery',
    20643: 'Dasham Avatar',
    20786: 'Sonic the Hedgehog',
    20792: 'Goynar Baksho',
    20799: 'Don',
    20811: 'The Irishman',
    20814: 'The Call of the Wild',
  };

  // Try Bengali movie alternative searches
  const bengaliFallback = {
    14161: ['Mukunda Shotru', 'Mukunda Shotoru'],
    14165: ['Hello Guru Prema Kosame', 'Prem Korechi Korboi Toh'],
    14213: ['Next Door Neighbor', 'Next Door Neighbour'],
    14229: ['A River Called Titas', 'Titas Ekti Nadir Naam'],
  };

  for (const [id, title] of Object.entries(manual)) {
    await rematch(Number(id), title);
    // Small delay to be nice to TMDb rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  // Try Bengali alternative titles
  for (const [id, titles] of Object.entries(bengaliFallback)) {
    for (const t of titles) {
      await rematch(Number(id), t);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Now try the remaining 43 not_found + 7 needs_review with cleanSearchTitle only
  const remaining = await query(
    `SELECT id, payload FROM content_catalog WHERE metadata_status IN ('not_found', 'needs_review') AND id NOT IN (${Object.keys(manual).join(',')}) ORDER BY id`
  );
  console.log(`\nRemaining to try with title cleaning only: ${remaining.rows.length}`);
  for (const row of remaining.rows) {
    const item = row.payload;
    const cleaned = cleanSearchTitle(item.title);
    if (cleaned && cleaned !== item.title && cleaned.length > 2) {
      await rematch(row.id, cleaned);
      await new Promise(r => setTimeout(r, 200));
    } else {
      console.log(`- ID=${row.id}: "${item.title}" → skip (clean = "${cleaned}")`);
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
