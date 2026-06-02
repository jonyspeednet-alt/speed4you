const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  // Track all requests/errors in order
  const events = [];
  page.on('request', req => events.push({t: events.length, type: 'req', url: req.url().substring(0,150)}));
  page.on('response', resp => events.push({t: events.length, type: 'res', status: resp.status(), url: resp.url().substring(0,150)}));
  page.on('requestfailed', req => events.push({t: events.length, type: 'fail', err: req.failure()?.errorText, url: req.url().substring(0,150)}));
  page.on('console', msg => events.push({t: events.length, type: 'console', level: msg.type(), text: msg.text().substring(0,200)}));
  
  await page.goto('https://speed4you.net/watch/5195', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(8000);
  
  // Get video state
  const videoInfo = await page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return {found: false};
    return {
      found: true,
      src: v.src,
      readyState: v.readyState,
      error: v.error ? {code: v.error.code, message: v.error.message} : null,
      networkState: v.networkState,
      currentTime: v.currentTime,
    };
  });
  
  console.log('=== VIDEO STATE ===');
  console.log(JSON.stringify(videoInfo, null, 2));
  
  console.log('\n=== ALL EVENTS (chronological) ===');
  for (const e of events) {
    if (e.type === 'req') console.log(`[${e.t}] REQ ${e.url}`);
    else if (e.type === 'res') console.log(`[${e.t}] RES ${e.status} ${e.url}`);
    else if (e.type === 'fail') console.log(`[${e.t}] FAIL ${e.err} ${e.url}`);
    else if (e.type === 'console' && e.level === 'error') console.log(`[${e.t}] CONSOLE ERROR ${e.text}`);
  }
  
  await browser.close();
})();
