const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:4100' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  // Check series list
  const series = await get('/series');
  console.log('=== /series ===');
  console.log('Keys:', Object.keys(series));
  console.log('Total items:', series.items ? series.items.length : 'no items');
  if (series.items) {
    const himym = series.items.filter(i => i.title && i.title.toLowerCase().includes('mother'));
    console.log('HIMYM found:', himym.length);
    if (himym.length > 0) {
      const s = himym[0];
      console.log('Title:', s.title, '| ID:', s.id, '| Published:', s.published, '| Status:', s.status);
      console.log('Seasons:', (s.seasons || []).length);
    } else {
      // Show first few
      series.items.slice(0, 5).forEach(i => console.log(`  ${i.id}: ${i.title} (${i.type}) [${i.status}]`));
    }
  }

  // Try /content/browse for series
  const browse = await get('/content/browse?type=series&limit=10');
  console.log('\n=== /content/browse?type=series ===');
  console.log('Keys:', Object.keys(browse));
  if (browse.items) {
    const himym2 = browse.items.filter(i => i.title && i.title.toLowerCase().includes('mother'));
    console.log('HIMYM found:', himym2.length);
    browse.items.slice(0, 5).forEach(i => console.log(`  ${i.id}: ${i.title} (${i.type})`));
  }
}

main().catch(console.error);
