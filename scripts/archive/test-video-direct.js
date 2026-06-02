const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  await page.setContent(`
    <html><body>
    <h1>Direct Video Test</h1>
    <video id="test-video" controls width="800" preload="metadata"
      src="https://speed4you.net/portal-api/api/player/stream/movie/5195?season=1&episode=1">
    </video>
    <script>
      const v = document.getElementById('test-video');
      v.addEventListener('loadstart', () => console.log('loadstart'));
      v.addEventListener('loadedmetadata', () => console.log('loadedmetadata', v.duration, v.videoWidth, v.videoHeight));
      v.addEventListener('loadeddata', () => console.log('loadeddata'));
      v.addEventListener('canplay', () => console.log('canplay'));
      v.addEventListener('error', () => console.log('video error', v.error ? v.error.code + ' ' + v.error.message : 'unknown'));
      v.addEventListener('abort', () => console.log('abort'));
      v.addEventListener('suspend', () => console.log('suspend'));
      v.addEventListener('stalled', () => console.log('stalled'));
      v.addEventListener('waiting', () => console.log('waiting'));
    </script>
    </body></html>
  `);
  
  await page.waitForTimeout(10000);
  
  const state = await page.evaluate(() => {
    const v = document.getElementById('test-video');
    return {
      readyState: v.readyState,
      networkState: v.networkState,
      error: v.error ? { code: v.error.code, message: v.error.message } : null,
      duration: v.duration,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      currentTime: v.currentTime,
    };
  });
  console.log('Video state:', JSON.stringify(state, null, 2));
  
  await browser.close();
})();
