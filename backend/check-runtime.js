const { getAppState } = require('./src/data/store');

const runtime = getAppState('scanner_runtime');
const log = getAppState('scanner_log');

console.log('Runtime:', JSON.stringify(runtime, null, 2));
console.log('Latest run:', JSON.stringify(log?.runs?.[0], null, 2));

process.exit(0);
