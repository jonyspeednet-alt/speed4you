require('dotenv').config();
const { query } = require('../src/config/database');
const { enrichItemWithMetadata } = require('../src/services/scanner-enhanced-metadata');

const OMDB_KEY = process.env.OMDB_API_KEY;

async function omdbSearch(title, type) {
  const url = `https://www.omdbapi.com/?s=${encodeURIComponent(title)}&type=${type === 'series' ? 'series' : 'movie'}&apikey=${OMDB_KEY}`;
  const res = await fetch(url); const data = await res.json();
  if (data.Response === 'False' || !data.Search?.length) return null;
  return data.Search[0];
}
async function omdbById(imdbId) {
  const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`);
  const data = await res.json();
  return data.Response === 'False' ? null : data;
}

// Known correct titles for items with dirty names
const TITLE_FIXES = {
  20808: 'Once Upon a Time in Hollywood',
  20820: 'Rangbaaz Darr Ki Rajneeti',
  14141: 'Cha Garam',
  14157: 'Maharshi',
  14185: 'Soorarai Pottru',
  14195: 'Velaikkaran',
  14286: 'Parbona Ami Charte Toke',
};

// Items to try OMDB with different/search title
const OMDB_ALT = {
  2011:  ['22 April'],                              // needs_review
  2097:  ['Bhalobasar Shohor'],
  2099:  ['Bhalobashar Shohor Saayori'],
  2104:  ['Bilaap'],
  2155:  ['Cholo Digonte'],
  2190:  ['Crisis on Earth X', 'Crisis on Earth-X'], // Arrowverse special
  2589:  ['Out of the Cradle'],
  2729:  ['Special Ops'],
  2751:  ['Sufiyana'],
  3564:  ['The Five'],
  3971:  ['The Hearts of the Down Under and My Son'],
  4463:  ['Corona Virus', 'Corona Virus The Silent Killer'],
  4922:  ['Goodbye', 'Goodbye 2022'],
  5202:  ['Silent Love', 'Silent Love 2024'],
  14151: ['Ishtangaa Icche Ghuri', 'Ishtanga Icche Ghuri'],
  14161: ['Mukunda Shotru', 'Mukunda Shotoru'],
  14165: ['Hello Guru Prema Kosame', 'Prem Korechi Korboi Toh'],
  14253: ['Aschorjo Prodip'],
  14266: ['Tarkata'],
  14276: ['Anil Bagchir Ekdin'],
  14291: ['Pipra Bidya'],
  14464: ['Herey Jabar Golpo'],
  14485: ['Khachar Bhetor Ochin Pakhi'],
  14830: ['Titas Ekti Nadir Naam', 'A River Called Titas'],
  14874: ['Heerak Rajar Deshe'],
  14973: ['Ambar Sen Antardhan Rahasya'],
  15155: ['Sob Charitro Kalponik'],
  15270: ['Sedin Dekha Hoyechilo'],
  15712: ['Mishawr Rawhoshyo'],
  16406: ['Sudhu Tomari Jonno'],
  16751: ['Saheb Bibi Golaam'],
  18010: ['Basu Poribar'],
  18037: ['Bhobishyoter Bhoot'],
  19450: ['Urojahaj', 'Urojahaj The Flight'],
  19715: ['Hobu Chandra Raja Gobu Chandra Montri'],
  20086: ['812 Binay Badal Dinesh'],
  20499: ['Toke Chhara Banchbo Naa'],
  20563: ['Archier Gallery'],
  20643: ['Dasham Avatar'],
  20792: ['Goynar Baksho'],
  20802: ['Baadshah'],
};

async function fixItem(id, cleanTitle) {
  const row = await query('SELECT payload FROM content_catalog WHERE id = $1', [id]);
  if (!row.rows.length) return;
  const item = row.rows[0].payload;
  const currentTitle = item.title;

  // Step 1: If we have a cleaner title, update DB first
  if (cleanTitle && cleanTitle !== currentTitle) {
    await query('UPDATE content_catalog SET title = $2, updated_at = NOW() WHERE id = $1', [id, cleanTitle]);
    item.title = cleanTitle;
  }

  // Step 2: Try TMDb enrichment
  try {
    const enriched = await enrichItemWithMetadata({ ...item, title: item.title });
    if (enriched.metadataStatus === 'matched') {
      await query(
        `UPDATE content_catalog SET payload = $2::jsonb, metadata_status = 'matched', title = $3, updated_at = NOW() WHERE id = $1`,
        [id, JSON.stringify({ ...item, ...enriched, title: item.title }), item.title]
      );
      console.log(`✅ ID=${id}: "${item.title}" → TMDb matched`);
      return;
    }
  } catch (e) {
    // TMDb failed, try OMDB
  }

  // Step 3: Try OMDB search
  const searchRes = await omdbSearch(item.title, item.type || 'movie');
  if (searchRes?.imdbID) {
    const omdbData = await omdbById(searchRes.imdbID);
    if (omdbData) {
      const updated = {
        ...item,
        title: omdbData.Title || item.title,
        description: omdbData.Plot !== 'N/A' ? omdbData.Plot : '',
        poster: omdbData.Poster !== 'N/A' ? omdbData.Poster : item.poster,
        backdrop: omdbData.Poster !== 'N/A' ? omdbData.Poster : item.backdrop,
        genre: omdbData.Genre !== 'N/A' ? omdbData.Genre : '',
        genres: omdbData.Genre !== 'N/A' ? omdbData.Genre.split(',').map(g => g.trim()) : [],
        rating: omdbData.imdbRating !== 'N/A' ? parseFloat(omdbData.imdbRating) : null,
        runtime: omdbData.Runtime !== 'N/A' ? parseInt(omdbData.Runtime, 10) : null,
        imdbId: omdbData.imdbID,
        year: parseInt(omdbData.Year, 10) || item.year,
        metadataStatus: 'matched',
        metadataProvider: 'omdb',
        metadataConfidence: 100,
        metadataUpdatedAt: new Date().toISOString(),
      };
      await query(
        `UPDATE content_catalog SET payload = $2::jsonb, title = $3, metadata_status = 'matched', year = $4, rating = $5, updated_at = NOW() WHERE id = $1`,
        [id, JSON.stringify(updated), updated.title, updated.year, updated.rating]
      );
      console.log(`✅ ID=${id}: "${item.title}" → OMDB matched (${omdbData.imdbID})`);
      return;
    }
  }

  // Still not found after this round
  console.log(`❌ ID=${id}: "${item.title}" → still not matched`);
}

async function fixMissingPosters(id) {
  const row = await query('SELECT payload FROM content_catalog WHERE id = $1', [id]);
  if (!row.rows.length) return;
  const item = row.rows[0].payload;
  const hasBadPoster = !item.poster || !item.poster.startsWith('http');
  const hasBadBackdrop = !item.backdrop || !item.backdrop.startsWith('http');
  const hasNoDesc = !item.description;

  if (!hasBadPoster && !hasBadBackdrop && !hasNoDesc) return; // all good

  // Try OMDB using existing imdbId
  if (item.imdbId) {
    const omdbData = await omdbById(item.imdbId);
    if (omdbData) {
      const update = {};
      if (hasBadPoster && omdbData.Poster !== 'N/A') update.poster = omdbData.Poster;
      if (hasBadBackdrop && omdbData.Poster !== 'N/A') update.backdrop = omdbData.Poster;
      if (hasNoDesc && omdbData.Plot !== 'N/A') update.description = omdbData.Plot;
      if (Object.keys(update).length) {
        const next = { ...item, ...update };
        await query('UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW() WHERE id = $1', [id, JSON.stringify(next)]);
        console.log(`🖼️ ID=${id}: "${item.title}" → poster/desc fixed`);
        return;
      }
    }
  }

  // No IMDb ID — try searching OMDB by title
  const searchRes = await omdbSearch(item.title, item.type || 'movie');
  if (searchRes?.imdbID) {
    const omdbData = await omdbById(searchRes.imdbID);
    if (omdbData) {
      const update = {};
      if (hasBadPoster && omdbData.Poster !== 'N/A') update.poster = omdbData.Poster;
      if (hasBadBackdrop && omdbData.Poster !== 'N/A') update.backdrop = omdbData.Poster;
      if (hasNoDesc && omdbData.Plot !== 'N/A') update.description = omdbData.Plot;
      if (Object.keys(update).length) {
        const next = { ...item, ...update, imdbId: omdbData.imdbID };
        await query('UPDATE content_catalog SET payload = $2::jsonb, updated_at = NOW() WHERE id = $1', [id, JSON.stringify(next)]);
        console.log(`🖼️ ID=${id}: "${item.title}" → poster/desc fixed via OMDB search`);
        return;
      }
    }
  }

  console.log(`- ID=${id}: "${item.title}" → still missing poster/desc`);
}

async function main() {
  console.log('=== STEP 1: Fix titles + TMDb/OMDB rematch ===\n');
  for (const [idStr, titles] of Object.entries(OMDB_ALT)) {
    const id = Number(idStr);
    for (const t of titles) {
      await fixItem(id, t);
      await new Promise(r => setTimeout(r, 300));
      // Check if matched now
      const check = await query('SELECT metadata_status FROM content_catalog WHERE id = $1', [id]);
      if (check.rows[0]?.metadata_status === 'matched') break;
    }
  }

  console.log('\n=== STEP 2: Fix missing posters/descriptions for matched items ===\n');
  const missingResult = await query(
    `SELECT id FROM content_catalog WHERE metadata_status = 'matched'
     AND ((payload->>'poster' IS NULL OR payload->>'poster' = '' OR payload->>'poster' NOT LIKE 'http%')
       OR (payload->>'backdrop' IS NULL OR payload->>'backdrop' = '' OR payload->>'backdrop' NOT LIKE 'http%')
       OR (payload->>'description' IS NULL OR payload->>'description' = ''))`
  );
  for (const row of missingResult.rows) {
    await fixMissingPosters(row.id);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n=== FINAL SUMMARY ===');
  const final = await query(`SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE metadata_status = 'matched')::int AS matched,
    COUNT(*) FILTER (WHERE metadata_status = 'not_found')::int AS not_found,
    COUNT(*) FILTER (WHERE metadata_status = 'needs_review')::int AS needs_review
  FROM content_catalog`);
  const r = final.rows[0];
  console.log(`Total: ${r.total}, Matched: ${r.matched}, Not found: ${r.not_found}, Needs review: ${r.needs_review}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
