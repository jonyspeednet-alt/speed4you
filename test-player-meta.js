const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  // Intercept and block the remux-copy / stream to force direct play
  // Try the direct data.speed4you.net URL instead
  // First, get the player metadata to see if direct file works
  
  page.on('response', async resp => {
    const url = resp.url();
    // Try to get the source path from the metadata
    if (url.includes('/api/player/movie/5195')) {
      const data = await resp.json();
      console.log('Stream metadata:', JSON.stringify(data, null, 2));
    }
  });
  
  await page.goto('https://speed4you.net/watch/5195', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  const videoState = await page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return { found: false };
    return {
      found: true,
      src: v.src,
      readyState: v.readyState,
      networkState: v.networkState,
      error: v.error ? { code: v.error.code, message: v.error.message } : null,
      currentTime: v.currentTime,
    };
  });
  console.log('\nVideo state:', JSON.stringify(videoState));
  await browser.close();
})();
