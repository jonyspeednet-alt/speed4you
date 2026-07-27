const https = require('https');

const url = 'https://ctgmovies.com/movies/con-city';

https.get(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  timeout: 30000,
}, (res) => {
  let data = '';
  res.on('data', (c) => { data += c; });
  res.on('end', () => {
    // Find all ctgfun.com video URLs in the raw HTML
    const regex = /https?:\/\/(?:ftp|movie|data)\.ctgfun\.com\/[^\s"'<>\\]+?\.(mp4|mkv)/gi;
    let m;
    const urls = new Set();
    while ((m = regex.exec(data)) !== null) urls.add(m[0]);
    console.log('HTML length:', data.length);
    console.log('Found', urls.size, 'video URLs');
    urls.forEach(u => console.log(u));

    // Also look in __next_f push data
    const rscRegex = /self\.__next_f\.push\(\[1,"(.+?)"\]\)/gs;
    let rscMatch;
    let rscUrls = new Set();
    while ((rscMatch = rscRegex.exec(data)) !== null) {
      let content = rscMatch[1];
      content = content.replace(/\\u0022/g, '"').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      const urlRegex2 = /https?:\/\/(?:ftp|movie|data)\.ctgfun\.com\/[^\s"'<>\\]+?\.(mp4|mkv)/gi;
      let u2;
      while ((u2 = urlRegex2.exec(content)) !== null) rscUrls.add(u2[0]);
    }
    console.log('\nFrom RSC payload:', rscUrls.size, 'URLs');
    rscUrls.forEach(u => console.log(u));
  });
}).on('error', (e) => {
  console.error('Error:', e.message);
});
