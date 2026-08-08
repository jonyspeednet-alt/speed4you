/**
 * test_omdb.js
 * Test OMDB API lookup for the 4 problem titles
 */
require('dotenv').config();

async function testOmdb() {
  const apiKey = process.env.OMDB_API_KEY || 'f007c5f2';
  const queries = [
    'Taskaree',
    'Objection My Lord',
    'Made In India',
    'Dil Deewana Ho Gaya'
  ];

  console.log(`=== OMDB API DIRECT TEST (Key: ${apiKey}) ===\n`);

  for (const q of queries) {
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(q)}&apikey=${apiKey}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log(`Query: "${q}"`);
      console.log(`  Response: ${data.Response}`);
      if (data.Response === 'True') {
        console.log(`  Results count: ${data.Search.length}`);
        data.Search.forEach(s => console.log(`    - [${s.Type}] "${s.Title}" (${s.Year}) IMDb:${s.imdbID} Poster:${Boolean(s.Poster && s.Poster !== 'N/A')}`));
      } else {
        console.log(`  Error: ${data.Error}`);
      }
    } catch (e) {
      console.log(`  Fetch failed: ${e.message}`);
    }
    console.log('');
  }
}

testOmdb().catch(console.error);
