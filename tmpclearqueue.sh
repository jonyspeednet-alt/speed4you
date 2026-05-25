cd /home/speed4you/portal-app/backend
node -e "
require('dotenv').config();
const q = require('./src/services/pipeline-queue');
q.clearAll().then(() => console.log('OK cleared')).catch(e => console.error('ERR:', e.message));
" 2>&1