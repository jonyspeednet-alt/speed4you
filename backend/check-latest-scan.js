const { getScannerRuns } = require('./src/data/store');

(async () => {
  const runs = getScannerRuns(3);
  console.log(JSON.stringify(runs, null, 2));
  process.exit(0);
})();
