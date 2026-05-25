const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  // Monitor React state changes via monkey-patch
  await page.addInitScript(() => {
    const origPushState = history.pushState.bind(history);
    history.pushState = function() { console.log('[URL_CHANGE] pushState', arguments[2]); return origPushState.apply(this, arguments); };
    const origReplaceState = history.replaceState.bind(history);
    history.replaceState = function() { console.log('[URL_CHANGE] replaceState', arguments[2]); return origReplaceState.apply(this, arguments); };
    
    // Monitor video src changes
    const videoProto = HTMLVideoElement.prototype;
    const srcDescriptor = Object.getOwnPropertyDescriptor(videoProto, 'src') || Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (srcDescriptor && srcDescriptor.set) {
      const origSet = srcDescriptor.set;
      Object.defineProperty(videoProto, 'src', {
        set(value) {
          console.log('[VIDEO_SRC_SET]', value ? value.substring(0, 150) : 'null');
          origSet.call(this, value);
        },
        get() { return srcDescriptor.get.call(this); }
      });
    }
  });
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[URL_CHANGE]') || text.startsWith('[VIDEO_SRC_SET]')) {
      console.log(msg.type(), text);
    }
  });
  
  await page.goto('https://speed4you.net/watch/5195', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(10000);
  
  console.log('\n=== FINAL STATE ===');
  const videoState = await page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return { found: false };
    return {
      found: true,
      src: v.src,
      readyState: v.readyState,
      networkState: v.networkState,
      error: v.error ? {code: v.error.code, message: v.error.message} : null,
      currentTime: v.currentTime,
      duration: v.duration,
    };
  });
  console.log(JSON.stringify(videoState, null, 2));
  
  await browser.close();
})();
