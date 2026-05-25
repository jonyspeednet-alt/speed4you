const { chromium } = require('playwright');
const TARGET_URL = 'https://speed4you.net/watch/5195';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  const failures = {};
  page.on('requestfailed', req => {
    const url = req.url();
    const err = req.failure()?.errorText || 'unknown';
    if (!failures[url]) failures[url] = { count: 0, error: err };
    failures[url].count++;
  });
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);
  console.log('=== PAGE TEXT ===');
  const text = await page.textContent('body');
  console.log(text.substring(0, 1500));
  console.log('\n=== REQUEST FAILURES ===');
  for (const [url, info] of Object.entries(failures)) {
    console.log(info.count + 'x', info.error, url);
  }
  await page.screenshot({ path: '/tmp/player-5195-final.png', fullPage: false });
  await browser.close();
})();
