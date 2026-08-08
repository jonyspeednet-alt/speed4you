const { startScanJob } = require('./src/services/scanner');

(async () => {
  try {
    console.log("Starting scan job...");
    const job = await startScanJob([], { dryRun: false });
    console.log("Scan started successfully:", job);
    process.exit(0);
  } catch (error) {
    console.error("Failed to start scan:", error.message);
    process.exit(1);
  }
})();
