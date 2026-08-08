const { getAppState } = require('./src/data/store');

const runtime = getAppState('scanner_runtime');
const log = getAppState('scanner_log');
const lastScan = getAppState('last_scan_summary');

console.log('Scanner Runtime:', JSON.stringify(runtime, null, 2));
console.log('\nScanner Log (latest):', JSON.stringify(log?.runs?.[0], null, 2));
console.log('\nLast Scan Summary:', JSON.stringify(lastScan, null, 2));

process.exit(0);
