/**
 * auto_transliterate_all_remaining_non_latin.js
 * Automatically transliterates all remaining Bengali, Hindi, Tamil, Telugu, Malayalam filenames
 * using sanscript/transliteration mappings and renames disk files & DB records.
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { enrichItemWithMetadata } = require('../services/metadata-enricher');

const TRANSLITERATION_DICTIONARY = {
  // Bengali
  "প্রিয়তমা": "Priyotoma",
  "ধ্যাততেরিকি": "Dhyatteriki",
  "জানোয়ার": "Janwar",
  "হাওয়া": "Hawa",
  "কণ্ঠ": "Kantho",
  "টিকি-টাকা": "Tiki-Taka",
  "অপারেশন সুন্দরবন": "Operation Sundarbans",
  "আহা রে": "Aaha Re",
  "কাঠবিড়ালী": "Kathbirali",
  "ডুব": "Doob No Bed Of Roses",
  "ফাগুন হাওয়ায়": "Fagun Haway",

  // Hindi
  "दिल से": "Dil Se",
  "जोगी": "Jogi",
  "गुड न्यूज़": "Good Newwz",
  "टीटू अम्बानी": "Titu Ambani",
  "लव यात्री": "Loveyatri",
  "छिछोरे": "Chhichhore",
  "एक लड़की को देखा तोह ऐसा लगा": "Ek Ladki Ko Dekha Toh Aisa Laga",
  "स्त्री": "Stree",
  "टोटल धमाल": "Total Dhamaal",
  "कारवाँ": "Karwaan",
  "भूत बंगला": "Bhoot Bangla",
  "बदला": "Badla",
  "दोबारा": "Dobaaraa",
  "भारत": "Bharat",
  "पल्टन": "Paltan",
  "कोड नेम तिरंगा": "Code Name Tiranga",
  "मेरे देश की धरती": "Mere Desh Ki Dharti",
  "शिद्दत": "Shiddat",
  "तू या मैं": "Tu Ya Main",
  "नवबज़ादे": "Nawabzaade",
  "निकम्मा": "Nikamma",
  "हलाहल": "Halahal",
  "मिशन मंगल": "Mission Mangal",
  "ऐ दिल है मुश्किल": "Ae Dil Hai Mushkil",
  "रात बाकि है": "Raat Baaki Hai",
  "एवरीबडी लव्स सोहराब हांडा": "Everybody Loves Sohrab Handa",
  "शेरनी": "Sherni",
  "काग़ज़": "Kaagaz",
  "लैला मजनू": "Laila Majnu",
  "हिचकी": "Hichki",
  "अय्यारी": "Aiyaary",
  "पति पत्नी और वो": "Pati Patni Aur Woh",
  "हैप्पी पटेल ख़तरनाक जासूस": "Happy Patel Khatarnak Jasoos",
  "पटाखा": "Pataakha",
  "कबीर सिंह": "Kabir Singh",
  "अतरंगी रे": "Atrangi Re",
  "आहान": "Ahaan",
  "कोई जाने ना": "Koi Jaane Na",
  "चंडीगढ़ करे आशिकी": "Chandigarh Kare Aashiqui",
  "द पावर": "The Power",
  "द बिग बुल": "The Big Bull",
  "धमाका": "Dhamaka",
  "मैडम चीफ मिनिस्टर": "Madam Chief Minister",
  "रश्मि रॉकेट": "Rashmi Rocket",
  "रामप्रसाद की तेहरवी": "Ramprasad Ki Tehrvi",
  "शादीस्थान": "Shaadisthan",
  "गिल्ली बॉय": "Gully Boy",
  "दबंग ३": "Dabangg 3",
  "फन्नी खान": "Fanney Khan",
  "घस्ट": "Ghost",
  "पागलपंती": "Pagalpanti",
  "पानीपत": "Panipat",
  "सत्यमेव जयते": "Satyameva Jayate",
  "मरजावां": "Marjaavaan",
  "सोनचिरैया": "Sonchiriya",

  // South Indian (Tamil / Telugu / Malayalam)
  "ഭീഷ്‍മ പര്‍വ്വം": "Bheeshma Parvam",
  "മേജർ": "Major",
  "கார்கி": "Gargi",
  "సెబాస్టియన్ P.C. 524": "Sebastian PC 524",
  "ഭ്രമം": "Bhramam",
  "ലൂക്ക": "Luca",
  "அனபெல் சேதுபதி": "Annabelle Sethupathi",
  "డెకాయిట్": "Dacoit",
  "పుష్పా - The Rise": "Pushpa The Rise",
  "ది వారియర్": "The Warriorr",
  "గని": "Ghani",
  "மாறன்": "Maaran",
  "வாத்தி": "Vaathi",
  "பொன்னியின் செல்வன்": "Ponniyin Selvan",
  "விக்ரம்": "Vikram",
  "சர்தார்": "Sardar",
  "டான்": "Don"
};

async function transliterateRemaining() {
  console.log('=== TRANSLITERATING REMAINING NON-LATIN MEDIA FILES & DB ===\n');

  const records = await query(`
    SELECT id, title, payload
    FROM content_catalog
    WHERE payload->>'sourcePath' ~ '[\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]'
  `);

  console.log(`Found ${records.rows.length} remaining non-Latin media records.\n`);

  let renamedCount = 0;

  for (const row of records.rows) {
    const item = row.payload;
    const oldPath = item.sourcePath;

    if (!oldPath || !fs.existsSync(oldPath)) {
      console.log(`  Skipping ID:${row.id} - path missing: ${oldPath}`);
      continue;
    }

    const dirName = path.dirname(oldPath);
    const baseName = path.basename(oldPath);
    const yearMatch = baseName.match(/\((19|20)\d{2}\)/);
    const yearStr = yearMatch ? ` ${yearMatch[0]}` : '';
    const ext = path.extname(baseName);

    // Extract core name
    const coreName = baseName.replace(/\((19|20)\d{2}\)/, '').replace(/\.[a-z0-9]{2,4}$/i, '').trim();

    const englishTitle = TRANSLITERATION_DICTIONARY[coreName] || TRANSLITERATION_DICTIONARY[coreName.normalize('NFC')] || null;

    if (!englishTitle) {
      console.log(`  [UNMAPPED] ID:${row.id} coreName:"${coreName}" -> path:${oldPath}`);
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
  console.log(`COMPLETE TRANSLITERATION & POSTER FETCH COMPLETED:`);
  console.log(`- Renamed Files/Folders: ${renamedCount}`);
  console.log(`- Total Catalog Items: ${s.total}`);
  console.log(`- Items with Valid Poster: ${s.with_poster} (${Math.round((s.with_poster / s.total) * 100)}%)`);
  console.log(`- Items Missing Poster: ${s.missing_poster}`);
  console.log(`========================================`);

  process.exit(0);
}

transliterateRemaining().catch(console.error);
