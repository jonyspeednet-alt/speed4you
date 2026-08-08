require('dotenv').config();
const { query } = require('../config/database');

async function analyzeDrafts() {
  const dbRes = await query("SELECT id, title, status, payload FROM content_catalog WHERE content_type = 'series'");
  const reqInDb = dbRes.rows.filter(r => JSON.stringify(r.payload || {}).includes('/Requested/Series/'));
  
  const drafts = reqInDb.filter(r => r.status === 'draft');
  
  console.log('=== DRAFT SERIES ANALYSIS ===');
  console.log(`Total in DB from /Requested/Series/: ${reqInDb.length}`);
  console.log(`Draft count: ${drafts.length}`);
  console.log('');
  
  for (const d of drafts) {
    const p = d.payload || {};
    console.log(`--- ID: ${d.id} | "${d.title}" ---`);
    console.log(`  metadataStatus: ${p.metadataStatus || 'NONE'}`);
    console.log(`  metadataError: ${p.metadataError || 'none'}`);
    console.log(`  scanSignature: ${p.scanSignature || 'none'}`);
    console.log(`  sourcePath: ${p.sourcePath || 'none'}`);
    console.log(`  seasonCount: ${p.seasonCount || 0}, episodeCount: ${p.episodeCount || 0}`);
  }

  // Find duplicates - same sourcePath or same title
  console.log('\n=== DUPLICATE ANALYSIS ===');
  const sigMap = {};
  reqInDb.forEach(r => {
    const sig = r.payload?.scanSignature || '';
    if (!sigMap[sig]) sigMap[sig] = [];
    sigMap[sig].push({ id: r.id, title: r.title, status: r.status });
  });
  
  for (const [sig, items] of Object.entries(sigMap)) {
    if (items.length > 1) {
      console.log(`DUPLICATE scanSignature "${sig}":`);
      items.forEach(i => console.log(`  ID ${i.id}: "${i.title}" [${i.status}]`));
    }
  }

  process.exit(0);
}

analyzeDrafts().catch(console.error);
