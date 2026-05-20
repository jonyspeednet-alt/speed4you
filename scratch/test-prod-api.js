const https = require('https');

https.get('https://data.speed4you.net/portal-api/search?q=spider', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      console.log('Production Search API Status code:', res.statusCode);
      const parsed = JSON.parse(data);
      console.log('Production results count:', parsed.results?.length);
      console.log('First production result:', parsed.results?.[0]?.title);
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw data:', data.slice(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Error connecting to production API:', err.message);
});
