require('dotenv').config();
const { enrichItemWithMetadata } = require('../src/services/scanner-enhanced-metadata');
const { query } = require('../src/config/database');
const { normalizeItem } = require('../src/data/store/helpers');

function cleanTitle(title) {
  let t = String(title || '');

  // Strip (1), (2) etc numeric disambiguation suffixes
  t = t.replace(/\(\d+\)\s*$/, '').trim();

  // Strip [Telefilm], [Bengali], [Bangla] etc
  t = t.replace(/\[.*?\]/g, '').trim();

  // Strip "Bengali Dubbed", "Hindi Dubbed" etc
  t = t.replace(/\b(Bengali|Hindi|Tamil|Telugu|Malayalam|Kannada)\s*(Dubbed|Dub)?\b/gi, '').trim();

  // Strip quality/resolution tags that metadata-enricher's NOISE_PATTERNS doesn't catch
  t = t.replace(/\b(HC|HDRip|HDCAM|WEBRip|BRRip|DVDRip|BluRay|Bluray|WEB-DL|WEB DL|10bit|8bit|HEVC|x265|x264|AC3|DD5\.1|DD 5\.1|Dual-Audio|Dual Audio|Multi Audio|ESub|MSub|Subs?)\b/gi, '').trim();

  // Strip release group names
  t = t.replace(/\b(1XBET|KatmovieHD|MoviezFlix|Hon3y|PSA|YTS|YIFY|RARBG|FGT|PAHE|GalaxyRG|TGx|QxR|SARTRE|Tomboc|JOY|ETRG|Juggs|axxo|ShAaNiG)\b/gi, '').trim();

  // Strip "Reloaded Version", "Season 01", "S1" etc
  t = t.replace(/\b(Reloaded\s+Version|Complete\s+Series|Season\s+\d{1,2}|S\d{1,2})\b/gi, '').trim();

  // Clean remaining noise
  t = t.replace(/[-–—]+\s*$/, '').trim();
  t = t.replace(/\s+/g, ' ').trim();

  return t;
}

async function main() {
  const todo = [];
  const junkIds = [20791, 20793]; // portal-media-cache, Featurettes
  const typeFixIds = { 20795: 'series', 20820: 'series' }; // Man vs Bee, Rangbaaz

  // Delete junk
  for (const id of junkIds) {
    await query('DELETE FROM content_catalog WHERE id = $1', [id]);
    console.log(`Deleted junk: ID=${id}`);
    todo.push({ id, action: 'deleted' });
  }

  // Fix types
  for (const [id, type] of Object.entries(typeFixIds)) {
    await query('UPDATE content_catalog SET content_type = $2, updated_at = NOW() WHERE id = $1', [Number(id), type]);
    console.log(`Fixed type: ID=${id} -> ${type}`);
    todo.push({ id, action: `type->${type}` });
  }

  // Fetch items needing title cleanup + rematch
  const result = await query(
    `SELECT id, payload FROM content_catalog
     WHERE metadata_status IN ('needs_review', 'not_found')
       AND id NOT IN (${junkIds.join(',')})
       AND id NOT IN (${Object.keys(typeFixIds).join(',')})
     ORDER BY id`
  );

  let cleaned = 0;
  let matched = 0;

  for (const row of result.rows) {
    const item = row.payload;
    const originalTitle = item.title;
    const cleanedTitle = cleanTitle(originalTitle);

    if (cleanedTitle && cleanedTitle !== originalTitle) {
      // Update title in DB and try rematch
      const enriched = await enrichItemWithMetadata({ ...item, title: cleanedTitle });

      await query(
        `UPDATE content_catalog
         SET payload = $2::jsonb, metadata_status = $3, title = $4, updated_at = NOW()
         WHERE id = $1`,
        [item.id, JSON.stringify({ ...item, ...enriched, title: cleanedTitle }), enriched.metadataStatus || item.metadataStatus, cleanedTitle]
      );

      const status = enriched.metadataStatus === 'matched' ? '✅ matched' : '❌ still ' + enriched.metadataStatus;
      if (enriched.metadataStatus === 'matched') matched++;
      console.log(`ID=${item.id}: "${originalTitle}" → "${cleanedTitle}" ${status}`);
    }
    cleaned++;
  }

  console.log(`\nDone. Junk deleted: ${junkIds.length}, Types fixed: ${Object.keys(typeFixIds).length}, Title cleaned: ${cleaned}, Newly matched: ${matched}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
