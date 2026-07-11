const { chromium } = require('playwright');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
// First find a working item with a direct videoUrl from scanned roots
async function findWorkingItem() {
  const c = new Client({ host:'localhost',port:5432,database:'isp_entertainment',user:process.env.DB_USER || 'postgres',***REMOVED***:process.env.DB_PASSWORD || 'postgres' });
  await c.connect();
  const r = await c.query("SELECT id, payload->>'title' as t, payload->>'videoUrl' as v, payload->>'sourcePath' as s, payload->>'sourceRootId' as root FROM content_catalog WHERE payload->>'videoUrl' LIKE '/English_Movies%' AND payload->>'videoUrl' != '' AND payload->>'status' = 'published' LIMIT 1");
  if (r.rows.length) {
    console.log('Testing item:', r.rows[0].id, r.rows[0].t);
    return r.rows[0];
  }
  return null;
  await c.end();
}

(async () => {
  const item = await findWorkingItem();
  if (!item) { console.log('No working item found'); return; }
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
  const url = `https://speed4you.net/watch/${item.id}`;
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(6000);
  console.log('=== PAGE TEXT (truncated) ===');
  const text = await page.textContent('body');
  console.log(text.substring(0, 800));
  console.log('\n=== REQUEST FAILURES ===');
  for (const [url, info] of Object.entries(failures)) {
    console.log(info.count + 'x', info.error, url.substring(0, 120));
  }
  await browser.close();
})();
