cd /home/speed4you/portal-app/backend
node --check scripts/pipeline-runner.js && echo "SYNTAX OK" || echo "SYNTAX ERROR"
echo "---"
# Clear stale queue  
node -e "require('dotenv').config(); const q=require('./src/services/pipeline-queue'); q.clearAll().then(()=>console.log('CLEARED')).catch(e=>console.error(e.message))"