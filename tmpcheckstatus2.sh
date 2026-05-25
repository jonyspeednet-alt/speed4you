echo "=== Pipeline processes ==="
ps aux | grep -E 'pipeline-runner|ffprobe|ffmpeg' | grep -v grep | head -20
echo "=== Scanner lock ==="
cd /home/speed4you/portal-app/backend
node -e "
require('dotenv').config();
const q = require('./src/services/pipeline-queue');
(async () => {
  const [sl, nl, pl, log] = await Promise.all([
    q.getScannerLock(), q.getNormalizerLock(), q.getPipelineLock(), q.getLog(10)
  ]);
  console.log('scannerLock:', JSON.stringify(sl));
  console.log('normalizerLock:', JSON.stringify(nl));
  console.log('pipelineLock:', JSON.stringify(pl));
  console.log('---last 10 log entries---');
  log.forEach(l => console.log(l.timestamp.slice(11,19), l.message));
})();
" 2>&1