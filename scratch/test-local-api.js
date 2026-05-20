const http = require('http');

http.get('http://localhost:3001/api/search?q=spider', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      console.log('Status code:', res.statusCode);
      const parsed = JSON.parse(data);
      console.log('Parsed API response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw data:', data.slice(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Error connecting to local backend:', err.message);
});
