const { getScannerRunById } = require('./src/data/store');

(async () => {
  const run = await getScannerRunById('1786165968479');
  console.log(JSON.stringify(run, null, 2));
  process.exit(0);
})();
