/**
 * rename_hindi_movies_2026.js
 * Inspects all files/folders in /var/www/html/Hindi_Movies/2026/ that have Devnagari or non-English titles,
 * transliterates/renames them to clean English on disk and updates the catalog database.
 */
require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { enrichItemWithMetadata } = require('../services/metadata-enricher');

const HINDI_2026_MAP = {
  "100% इंडियन": "100 Percent Indian",
  "120 बहादुर": "120 Bahadur",
  "2026 की जंग": "2026 Ki Jung",
  "अजनबी": "Ajnabee",
  "अनटाइटल्ड अनुराग कश्यप प्रोजेक्ट": "Untitled Anurag Kashyap Project",
  "अनटाइटल्ड अली अब्बास ज़फर प्रोजेक्ट": "Untitled Ali Abbas Zafar Project",
  "अनटाइटल्ड कबीर खान प्रोजेक्ट": "Untitled Kabir Khan Project",
  "अनटाइटल्ड धर्मा प्रोडक्शंस प्रोजेक्ट": "Untitled Dharma Productions Project",
  "अनटाइटल्ड विशाल भारद्वाज प्रोजेक्ट": "Untitled Vishal Bhardwaj Project",
  "अनंत": "Anant",
  "अंदाज़ 2": "Andaaz 2",
  "अल्फा": "Alpha",
  "आज़ाद": "Azaad",
  "आवारा पागल दीवाना 2": "Awara Paagal Deewana 2",
  "इश्क़ विश्क़ रिबाउंड 2": "Ishq Vishk Rebound 2",
  "उड़ान 2": "Udaan 2",
  "एक और लव स्टोरी": "Ek Aur Love Story",
  "ऑपरेशन सिंदूर": "Operation Sindoor",
  "कमीने 2": "Kaminey 2",
  "कलंक 2": "Kalank 2",
  "किटी पार्टी": "Kitty Party",
  "क्रिश 4": "Krrish 4",
  "खलनायक 2": "Khalnayak 2",
  "गदर 3": "Gadar 3",
  "गुमराह 2": "Gumraah 2",
  "गेम चेंजर": "Game Changer",
  "गो गोवा गॉन 2": "Go Goa Gone 2",
  "गोलमाल 5": "Golmaal 5",
  "ग्राउंड जीरो": "Ground Zero",
  "चैम्पियन": "Champion",
  "जॉली एलएलबी 3": "Jolly LLB 3",
  "टार्ज़न 2": "Tarzan 2",
  "टाइगर 4": "Tiger 4",
  "तेज़": "Tezz",
  "तोहफा 2": "Tohfa 2",
  "त्रिनेत्र": "Trinetra",
  "द सन ऑफ सरदार 2": "Son of Sardaar 2",
  "द दिल्ली फाइल्स": "The Delhi Files",
  "द फेट ऑफ द फ्यूरियस 2": "The Fate of the Furious 2",
  "धड़क 2": "Dhadak 2",
  "धूम 4": "Dhoom 4",
  "नागिन": "Naagin",
  "नायक 2": "Nayak 2",
  "नो एंट्री 2": "No Entry 2",
  "पति पत्नी और वो 2": "Pati Patni Aur Woh 2",
  "परमवीर": "Param Vir",
  "पाताल लोक": "Paatal Lok",
  "पिंकी फरार 2": "Sandeep Aur Pinky Faraar 2",
  "बंटी और बबली 3": "Bunty Aur Babli 3",
  "बदला 2": "Badla 2",
  "बागी 4": "Baaghi 4",
  "बाज़ीगर 2": "Baazigar 2",
  "बाहुबली 3": "Baahubali 3",
  "बुलबुल 2": "Bulbbul 2",
  "बेधड़क": "Bedhadak",
  "बोर्न टू शाइन": "Born to Shine",
  "ब्रह्मास्त्र 2": "Brahmastra Part Two Dev",
  "ब्लैकआउट 2": "Blackout 2",
  "भारत 2": "Bharat 2",
  "भूल भुलैया 4": "Bhool Bhulaiyaa 4",
  "मर्डर 4": "Murder 4",
  "मस्ती 4": "Masti 4",
  "महाभारत": "Mahabharat",
  "मिशन मून": "Mission Moon",
  "मिस्टर इंडिया 2": "Mr India 2",
  "मुंज्या 2": "Munjya 2",
  "मुन्ना भाई 3": "Munna Bhai 3",
  "मेजर 2": "Major 2",
  "यारियां 3": "Yaariyan 3",
  "युद्धा": "Yodha 2",
  "रंगून 2": "Rangoon 2",
  "रनवे 34 पार्ट 2": "Runway 34 Part 2",
  "रा-वन 2": "Ra One 2",
  "राज 5": "Raaz 5",
  "रामायण पार्ट 1": "Ramayana Part 1",
  "रावण 2": "Raavan 2",
  "रेस 4": "Race 4",
  "रोबोट 3": "Robot 3",
  "लगे रहो मुन्ना भाई 2": "Lage Raho Munna Bhai 2",
  "लव सेक्स और धोखा 3": "LSD 3",
  "वॉर 2": "War 2",
  "वेलकम 3": "Welcome To The Jungle",
  "स्त्री 3": "Stree 3",
  "स्पेशल 26 पार्ट 2": "Special 26 Part 2",
  "स्वातंत्र्य वीर सावरकर 2": "Swatantrya Veer Savarkar 2",
  "हंगामा 3": "Hungama 3",
  "हाउसफुल 5": "Housefull 5",
  "हेरा फेरी 3": "Hera Pheri 3"
};

async function processHindi2026() {
  console.log('=== PROCESS & RENAME HINDI_MOVIES 2026 DIRECTORY ===\n');

  const targetDir = '/var/www/html/Hindi_Movies/2026';
  if (!fs.existsSync(targetDir)) {
    console.log(`Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(targetDir);
  console.log(`Found ${entries.length} items in ${targetDir}\n`);

  let renamedCount = 0;

  for (const item of entries) {
    // Check if item contains non-Latin (Devnagari) characters
    if (/[\u0900-\u097F]/.test(item)) {
      const oldPath = path.join(targetDir, item);
      const ext = path.extname(item);
      const coreName = item.replace(/\((19|20)\d{2}\)/, '').replace(/\.[a-z0-9]{2,4}$/i, '').trim();
      const yearMatch = item.match(/\((19|20)\d{2}\)/);
      const yearStr = yearMatch ? ` ${yearMatch[0]}` : ' (2026)';

      const englishTitle = HINDI_2026_MAP[coreName] || HINDI_2026_MAP[coreName.normalize('NFC')] || coreName;

      const newBaseName = ext ? `${englishTitle}${yearStr}${ext}` : `${englishTitle}${yearStr}`;
      const newPath = path.join(targetDir, newBaseName);

      console.log(`Renaming: "${item}" -> "${newBaseName}"`);

      try {
        if (oldPath !== newPath) {
          fs.renameSync(oldPath, newPath);
          renamedCount++;
        }

        // Update DB record if exists
        const oldUrlPart = `/Hindi_Movies/2026/${item}`;
        const newUrlPart = `/Hindi_Movies/2026/${newBaseName}`;
        const newPublicUrl = `https://data.speed4you.net${newUrlPart}`;

        const dbRes = await query(`
          SELECT id, payload FROM content_catalog
          WHERE payload->>'sourcePath' = $1 OR payload->>'sourcePath' = $2
        `, [oldPath, newPath]);

        if (dbRes.rows.length > 0) {
          const row = dbRes.rows[0];
          const payload = row.payload;
          payload.title = `${englishTitle}${yearStr}`;
          payload.sourcePath = newPath;
          payload.sourcePublicPath = newPublicUrl;
          if (payload.videoUrl) payload.videoUrl = newPublicUrl;

          const enriched = await enrichItemWithMetadata(payload);
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

          console.log(`  ✓ DB updated ID:${row.id} -> Poster: ${Boolean(enriched.poster && enriched.poster.startsWith('http'))}`);
        }
      } catch (err) {
        console.error(`  ✗ Error processing ${item}: ${err.message}`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`HINDI MOVIES 2026 RENAMING COMPLETED: ${renamedCount} items renamed.`);
  console.log(`========================================`);

  process.exit(0);
}

processHindi2026().catch(console.error);
