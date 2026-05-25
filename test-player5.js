const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[CONSOLE ERROR]', msg.text());
  });
  await page.goto('https://speed4you.net/watch/3427', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  const video = await page.$('video');
  if (video) {
    const info = await video.evaluate(v => ({
      src: v.src,
      readyState: v.readyState,
      paused: v.paused,
      error: v.error ? { code: v.error.code, message: v.error.message } : null,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      currentTime: v.currentTime,
      networkState: v.networkState,
    }));
    console.log('Video info:', JSON.stringify(info, null, 2));
  } else {
    console.log('No video element found');
    const text = await page.textContent('body');
    console.log('Page:', text.substring(0, 500));
  }
  await browser.close();
})();
