const { chromium } = require('playwright');
const TARGET_URL = 'https://speed4you.net/watch/5195';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('[FAIL]', req.url(), req.failure()?.errorText));
  page.on('response', resp => {
    if (resp.status() >= 400) console.log('[HTTP' + resp.status() + ']', resp.url());
  });
  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(8000);
    const text = await page.textContent('body');
    console.log('=== PAGE TEXT ===');
    console.log(text.substring(0, 1000));
    // Check for video element
    const video = await page.$('video');
    if (video) {
      const src = await video.getAttribute('src');
      console.log('Video src:', src);
      const readyState = await video.evaluate(v => v.readyState);
      const error = await video.evaluate(v => v.error ? { code: v.error.code, message: v.error.message } : null);
      console.log('Video readyState:', readyState);
      console.log('Video error:', JSON.stringify(error));
    }
    await page.screenshot({ path: '/tmp/player-5195.png', fullPage: false });
  } catch (e) {
    console.log('Error:', e.message);
  }
  await browser.close();
})();
