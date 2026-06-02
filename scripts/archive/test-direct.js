const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Test 1: Direct data.speed4you.net URL for the actual file
  console.log('=== Test 1: Direct file URL ===');
  const directUrl = 'https://data.speed4you.net/Other_Foreign_Movies/2024/Dancing%20Village%20The%20Curse%20Begins%20(2024)%20Hindi-Indonesian/Dancing%20Village%20The%20Curse%20Begins%20(2024)%20Hindi-Indonesian.mkv';
  try {
    const resp = await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('Status:', resp?.status());
    console.log('Content-Type:', resp?.headers()['content-type']);
  } catch(e) {
    console.log('Direct URL error:', e.message.slice(0, 100));
  }
  
  // Test 2: Player API stream URL (the one the player uses)
  console.log('\n=== Test 2: Stream API URL ===');
  const streamUrl = 'https://speed4you.net/portal-api/api/player/stream/movie/5195?season=1&episode=1';
  try {
    const resp = await page.goto(streamUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('Status:', resp?.status());
    console.log('Content-Type:', resp?.headers()['content-type']);
    console.log('Content-Length:', resp?.headers()['content-length']);
    const body = await resp.text();
    console.log('Body length:', body.length);
  } catch(e) {
    console.log('Stream URL error:', e.message.slice(0, 200));
  }
  
  await browser.close();
})();
