cd /home/speed4you/portal-app/backend
node scripts/pipeline-runner.js --scanner &
PID=$!
echo "Scanner PID: $PID"
sleep 5
# Check if running
kill -0 $PID 2>/dev/null && echo "RUNNING" || echo "DIED"
# Check log
node -e "
require('dotenv').config();
const q = require('./src/services/pipeline-queue');
setTimeout(async () => {
  const log = await q.getLog(5);
  log.forEach(l => console.log(l.timestamp.slice(11,19), l.message));
  const status = await q.getQueueStatus();
  console.log('Scanner total:', status.scanner.total, 'pending:', status.scanner.pending);
  process.exit(0);
}, 1000);
"