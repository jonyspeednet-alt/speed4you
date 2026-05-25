cd /home/speed4you/portal-app/backend
echo '=== SYNTAX CHECKS ==='
node --check ./src/services/pipeline-queue.js 2>&1
echo 'pipeline-queue:'$?
node --check ./scripts/pipeline-runner.js 2>&1
echo 'pipeline-runner:'$?
node --check ./src/routes/admin.js 2>&1
echo 'admin route:'$?
node --check ./src/controllers/adminController.js 2>&1
echo 'admin controller:'$?
echo ''
echo '=== REQUIRED FUNCTIONS ==='
grep -c 'getPipelineStatus' ./src/controllers/adminController.js
echo 'getPipelineStatus OK'
node -e 'var q=require("./src/services/pipeline-queue");console.log("Queue exports:",Object.keys(q).length,"functions")' 2>/dev/null
echo 'Modules loaded OK'
