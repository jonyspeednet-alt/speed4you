/**
 * rename_non_latin_media_files.js
 * 1. Identifies all media files/folders with non-Latin (Malayalam, Telugu, Tamil, Devanagari) characters.
 * 2. Uses TMDB search API and DDG search to find the official English / Romanized title.
 * 3. Renames physical files/folders on server disk.
 * 4. Updates content_catalog database records (title, sourcePath, videoUrl, etc.) and re-enriches TMDB metadata/posters.
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { enrichItemWithMetadata } = require('../services/metadata-enricher');

// Map of non-Latin raw directory names to clean English titles
const RAW_TO_ENGLISH_MAP = {
  "அச்சம் மேடம் நாணம் பயிர்ப்பு": "Achcham Madam Naanam Payirppu",
  "அன்புள்ள കില്ലി": "Anpulla Killi",
  "இங்கரன்": "Ingaran",
  "விடியாத இரவொன்று வேண்டும்": "Vidiyadha Iravondru Vendum",
  "விருமன்": "Viruman",
  "வீட்ல விசேஷம்": "Veetla Vishesham",
  "வெந்து தணிந்தது காடு": "Vendhu Thanindhathu Kaadu",
  "வேழம்": "Vezham",
  "అతిధి దేవోభవ": "Athidhi Devo Bhava",
  "ఆచార్య": "Acharya",
  "ఆడవాళ్లు మీకు జోహార్లు": "Aadavallu Meeku Joharlu",
  "ఓదెల రైల్వే స్టేషన్": "Odela Railway Station",
  "కళాపురం": "Kalapuram",
  "కిన్నెర‌సాని": "Kinnerasani",
  "గంధర్వ": "Gandharwa",
  "గాడ్సే": "Godse",
  "గ్యాంగ్‌స్టర్‌ గంగరాజు": "Gangster Gangaraju",
  "జయమ్మ పంచాయతీ": "Jayamma Panchayathi",
  "తీస్ మార్ ఖాన్": "Tees Maar Khan",
  "థ్యాంక్యూ": "Thank You",
  "పక్కా కమర్షియల్": "Pakka Commercial",
  "పెళ్ళికూతురు పార్టీ": "Pellikuthuru Party",
  "బ్లడీ మేరీ": "Bloody Mary",
  "భీమ్లా నాయక్‌": "Bheemla Nayak",
  "మళ్ళీ మొదలైంది": "Mallee Modalaindi",
  "రౌడీ బాయ్స్": "Rowdy Boys",
  "విందు భోజనం": "Vindu Bhojanam",
  "సమ్మతమే": "Sammathame",
  "సర్కారు వారి పాట​": "Sarkaru Vaari Paata",
  "సీతా రామం": "Sita Ramam",
  "సూపర్ మచ్చి": "Super Machi",
  "ಚಾರ್ಲಿ": "777 Charlie",
  "ತ್ರಿಕೋನ": "Trikona",
  "ಹರಿಕಥೆ ಅಲ್ಲ ಗಿರಿಕಥೆ": "Harikathe Alla Girikathe",
  "അന്താക്ഷരി": "Anthakshari",
  "ഇന്നലെ വരെ": "Innale Vare",
  "ഒരുത്തീ": "Oruthee",
  "കള്ളന്‍ ഡിസൂസ": "Kallan D'Souza",
  "കുറി": "Kuri",
  "കുറ്റവും ശിക്ഷയും": "Kuttavum Shikshayum",
  "ജാക് ആൻഡ് ജിൽ": "Jack N' Jill",
  "ജോൺ ലൂഥർ": "John Luther",
  "തിരിമാലി": "Thirimali",
  "നാല്": "Naal",
  "പത്രോസിന്റെ പടപ്പുകൾ": "Pathrosinte Padappukal",
  "പാപ്പൻ": "Paappan",
  "പാൽതു ജാൻവർ": "Palthu Janwar",
  "മേരി ആവാസ് സുനോ": "Meri Awas Suno",
  "വാശി": "Vaashi",
  "വെയിൽ": "Veyil",
  "സുന്ദരി ​ഗാർഡൻസ്": "Sundari Gardens",
  "സൂപ്പര്‍ ശരണ്യ": "Super Sharanya",
  "विक्रांत रोणा": "Vikrant Rona",
  "गंगूबाई काठियावाड़ी": "Gangubai Kathiawadi",
  "गुड लक जैरी": "Good Luck Jerry",
  "जर्सी": "Jersey",
  "बच्चन पांडे": "Bachchhan Paandey"
};

async function renameNonLatinMedia() {
  console.log('=== RENAMING NON-LATIN MEDIA FILES ON DISK & DB ===\n');

  // Find all DB records where sourcePath contains non-Latin scripts
  const records = await query(`
    SELECT id, title, payload
    FROM content_catalog
    WHERE payload->>'sourcePath' ~ '[\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]'
  `);

  console.log(`Found ${records.rows.length} records with non-Latin characters in sourcePath.\n`);

  let renamedCount = 0;

  for (const row of records.rows) {
    const item = row.payload;
    const oldPath = item.sourcePath;

    if (!oldPath || !fs.existsSync(oldPath)) {
      console.log(`  Skipping ID:${row.id} - path does not exist: ${oldPath}`);
      continue;
    }

    const dirName = path.dirname(oldPath);
    const baseName = path.basename(oldPath);
    const yearMatch = baseName.match(/\((19|20)\d{2}\)/);
    const yearStr = yearMatch ? ` ${yearMatch[0]}` : '';
    const ext = path.extname(baseName);

    // Extract core non-Latin title
    const coreName = baseName.replace(/\((19|20)\d{2}\)/, '').replace(/\.[a-z0-9]{2,4}$/i, '').trim();

    const englishTitle = RAW_TO_ENGLISH_MAP[coreName] || RAW_TO_ENGLISH_MAP[coreName.normalize('NFC')] || null;

    if (!englishTitle) {
      console.log(`  No mapping found for ID:${row.id} coreName:"${coreName}" - path:${oldPath}`);
      continue;
    }

    const newBaseName = ext ? `${englishTitle}${yearStr}${ext}` : `${englishTitle}${yearStr}`;
    const newPath = path.join(dirName, newBaseName);

    console.log(`  ID:${row.id} | Renaming disk: "${baseName}" -> "${newBaseName}"`);

    try {
      // 1. Rename on physical disk
      fs.renameSync(oldPath, newPath);
      renamedCount++;

      // 2. Update item payload with new path and english title
      const rootPath = '/var/www/html';
      const relPath = newPath.replace(rootPath, '');
      const newUrl = `https://data.speed4you.net${relPath.split('\\').join('/')}`;

      item.title = `${englishTitle}${yearStr}`;
      item.sourcePath = newPath;
      item.sourcePublicPath = newUrl;
      if (item.videoUrl) item.videoUrl = newUrl;

      // 3. Re-enrich metadata & posters with official English title
      const enriched = await enrichItemWithMetadata(item);
      const now = new Date().toISOString();

      await query(`
        UPDATE content_catalog
        SET payload = $2::jsonb,
            title = $3,
            title_key = $4,
            updated_at = $5,
            metadata_status = $6
        WHERE id = $1
      `, [row.id, JSON.stringify(enriched), enriched.title, (enriched.title || '').toLowerCase(), now, enriched.metadataStatus]);

      console.log(`    ✓ Disk & DB updated for ID:${row.id} -> Poster: ${Boolean(enriched.poster && enriched.poster.startsWith('http'))}`);
    } catch (err) {
      console.error(`    ✗ Error renaming ID:${row.id}: ${err.message}`);
    }
  }

  // Summary
  const summaryRes = await query(`
    SELECT 
      count(*) AS total,
      count(*) FILTER (WHERE payload->>'poster' LIKE 'http%') AS with_poster,
      count(*) FILTER (WHERE payload->>'poster' IS NULL OR payload->>'poster' = '' OR payload->>'poster' = 'null') AS missing_poster
    FROM content_catalog
  `);

  const s = summaryRes.rows[0];
  console.log(`\n========================================`);
  console.log(`NON-LATIN RENAMING COMPLETED:`);
  console.log(`- Renamed Files/Folders: ${renamedCount}`);
  console.log(`- Total Catalog Items: ${s.total}`);
  console.log(`- Items with Valid Poster: ${s.with_poster} (${Math.round((s.with_poster / s.total) * 100)}%)`);
  console.log(`- Items Missing Poster: ${s.missing_poster}`);
  console.log(`========================================`);

  process.exit(0);
}

renameNonLatinMedia().catch(console.error);
