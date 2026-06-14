const http = require('http');

http.get('http://127.0.0.1:4100/series?search=mother', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    const items = parsed.items || parsed.data || parsed.results || [];
    const found = items.filter(i => i.title && i.title.toLowerCase().includes('mother'));
    if (found.length > 0) {
      found.forEach(i => {
        console.log(`FOUND: ID=${i.id} | "${i.title}" (${i.year || ''}) | Seasons: ${(i.seasons || []).length} | Published: ${i.published} | Status: ${i.status}`);
      });
    } else {
      console.log('NOT FOUND in search results');
      console.log('First 3 items:', JSON.stringify(items.slice(0, 3), null, 2));
      console.log('Total items:', items.length);
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
});
