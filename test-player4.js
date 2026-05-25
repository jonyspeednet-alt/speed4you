const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  const failures = {};
  const responses = {};
  page.on('requestfailed', req => {
    const url = req.url();
    const err = req.failure()?.errorText || 'unknown';
    if (!failures[url]) failures[url] = { count: 0, error: err };
    failures[url].count++;
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/player/') && !responses[resp.url()]) {
      responses[resp.url()] = { status: resp.status(), headers: resp.headers() };
    }
  });
  // Test with English_Movies item 3427
  const url = 'https://speed4you.net/watch/3427';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(6000);
  console.log('\n=== RESPONSES ===');
  for (const [url, info] of Object.entries(responses)) {
    console.log(info.status, url.substring(0, 120));
  }
  console.log('\n=== FAILURES ===');
  for (const [url, info] of Object.entries(failures)) {
    console.log(info.count + 'x', info.error, url.substring(0, 120));
  }
  console.log('\n=== PAGE TEXT (first 600) ===');
  const text = await page.textContent('body');
  console.log(text.substring(0, 600));
  await browser.close();
})();
