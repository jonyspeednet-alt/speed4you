const { getScannerRunById } = require('./src/data/store');

(async () => {
  const run = await getScannerRunById('1786163131910');
  const requestedResult = run.rootResults.find(r => r.id === 'requested-series');
  console.log(JSON.stringify(requestedResult, null, 2));
  process.exit(0);
})();
