cd /home/speed4you/portal-app/backend

# Kill old pipeline
kill $(pgrep -f pipeline-runner) 2>/dev/null
sleep 1

# Clear stale queue
node -e "
require('dotenv').config();
const q = require('./src/services/pipeline-queue');
q.clearAll().then(() => {
  console.log('Queue cleared');
  process.exit(0);
}).catch(e => {
  console.error('ERR:', e.message);
  process.exit(1);
});
"