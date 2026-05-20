const https = require('https');

https.get('https://data.speed4you.net/portal-api/content/homepage', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('FEATURED:', JSON.stringify(parsed.featured, null, 2));
      console.log('LATEST[0]:', JSON.stringify(parsed.latest?.[0], null, 2));
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw data:', data.slice(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
