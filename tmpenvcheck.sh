# Check systemd service env
cat /etc/systemd/system/isp-portal.service 2>/dev/null | grep -E 'DB_|Environment|User=' | head -20
echo "---"
# Check pipeline process env
cat /proc/86570/environ 2>/dev/null | tr '\0' '\n' | grep -E '^DB_|^NODE_ENV' | head -10 || echo "can't read proc environ"
echo "---"
# Check env vars in shell
echo "NODE_ENV=$NODE_ENV"
echo "---"
# Check if pipeline queue data exists in DB using node directly
cd /home/speed4you/portal-app/backend
node -e "
require('dotenv').config();
const { getAppState, setAppState } = require('./src/data/store');
async function main() {
  console.log('pipeline_queue:', JSON.stringify(await getAppState('pipeline_queue')).slice(0,800) || 'null');
  console.log('---');
  console.log('pipeline_lock:', JSON.stringify(await getAppState('pipeline_lock')).slice(0,200) || 'null');
  console.log('---');
  console.log('pipeline_log:', JSON.stringify(await getAppState('pipeline_log')).slice(0,500) || 'null');
}
main().catch(e => console.error('ERR:', e.message));
" 2>&1