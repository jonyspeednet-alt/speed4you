const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:4100' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { 
          console.log('Raw response:', data.substring(0, 200));
          reject(e); 
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  // Get series detail by ID
  const detail = await get('/series/20775');
  console.log('=== Series Detail ===');
  console.log('Title:', detail.title);
  console.log('Year:', detail.year);
  console.log('Status:', detail.status);
  console.log('Published:', detail.published);
  console.log('Seasons:', (detail.seasons || []).length);
  
  if (detail.seasons) {
    detail.seasons.forEach(s => {
      console.log(`  ${s.title}: ${(s.episodes || []).length} episodes`);
    });
  }
}

main().catch(console.error);
