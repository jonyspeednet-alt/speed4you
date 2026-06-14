const path = require('path');

// Directly invoke the scanner to scan the series-f-m root
const rootPath = '/var/www/html/TV_Series/TV_Web_Series-F-M';

console.log('Starting direct scanner for root:', rootPath);
console.log('Target series: How I Met Your Mother (2005)');

// Check if the series directory exists
const fs = require('fs');
const seriesDir = path.join(rootPath, 'How I Met Your Mother (2005)');
if (fs.existsSync(seriesDir)) {
  console.log('Series directory exists');
  const seasons = fs.readdirSync(seriesDir);
  console.log('Seasons:', seasons.join(', '));
  for (const season of seasons) {
    const seasonDir = path.join(seriesDir, season);
    if (fs.statSync(seasonDir).isDirectory()) {
      const files = fs.readdirSync(seasonDir);
      console.log(`  ${season}: ${files.length} files`);
    }
  }
} else {
  console.log('Series directory does NOT exist yet - download may still be in progress');
}

// Now let's try to trigger the scanner by invoking the backend module directly
console.log('\nAttempting to trigger scanner via backend...');
try {
  const scanner = require('/home/speed4you/portal-app/backend/src/services/scanner');
  console.log('Scanner module loaded successfully');
  console.log('Available exports:', Object.keys(scanner).join(', '));
  
  // Check if there's a scanSeriesRoot or similar function
  if (typeof scanner.scanSeriesRoot === 'function') {
    console.log('scanSeriesRoot found, attempting scan...');
    scanner.scanSeriesRoot('series-f-m').then(result => {
      console.log('Scan result:', result);
    }).catch(err => {
      console.error('Scan error:', err);
    });
  } else if (typeof scanner.startScanJob === 'function') {
    console.log('startScanJob found');
    scanner.startScanJob({ rootIds: ['series-f-m'] });
  } else if (typeof scanner.processSeriesRoot === 'function') {
    console.log('processSeriesRoot found');
    // processSeriesRoot might need specific arguments
  }
} catch (err) {
  console.error('Failed to load scanner:', err.message);
}
