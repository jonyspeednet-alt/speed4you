const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function checkSeries(slug) {
  const url = `https://ctgmovies.com/tv/${slug}`;
  console.log(`Fetching: ${url}`);
  
  const html = await fetchPage(url);
  
  // Find ALL video URLs (not just first)
  const regex = /https?:\/\/(?:ftp|movie|data)\.ctgfun\.com\/[^\s"'<>\\]+?\.(mp4|mkv)/gi;
  let m;
  const allUrls = new Set();
  while ((m = regex.exec(html)) !== null) {
    const u = m[0];
    if (!u.includes('.hls/') && !u.includes('.audio.')) allUrls.add(u);
  }
  
  const urls = [...allUrls];
  console.log(`Total video URLs found: ${urls.length}`);
  
  // Show episode pattern
  const episodes = urls.filter(u => u.match(/S\d+E\d+/i));
  console.log(`URLs with SxxExx pattern: ${episodes.length}`);
  
  // Show first 5 URLs
  urls.slice(0, 10).forEach((u, i) => {
    const decoded = decodeURIComponent(new URL(u).pathname.split('/').pop());
    console.log(`  ${i + 1}. ${decoded.substring(0, 100)}`);
  });
  
  if (urls.length > 10) console.log(`  ... and ${urls.length - 10} more`);
}

// Test with House of the Dragon
checkSeries('house-of-the-dragon').catch(e => console.error(e.message));
