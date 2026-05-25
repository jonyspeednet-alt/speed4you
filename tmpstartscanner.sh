cd /home/speed4you/portal-app/backend
node -e "
require('dotenv').config();
const q = require('./src/services/pipeline-queue');
q.clearAll().then(() => {
  console.log('Queue cleared, now testing scanner...');
  const { spawn } = require('child_process');
  const child = spawn('node', ['scripts/pipeline-runner.js', '--scanner'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  child.unref();
  let out = '', err = '';
  child.stdout.on('data', d => out += d);
  child.stderr.on('data', d => err += d);
  setTimeout(() => {
    console.log('stdout:', out.slice(0,500));
    console.log('stderr:', err.slice(0,500));
    // check lock
    q.getScannerLock().then(l => console.log('lock after start:', JSON.stringify(l)));
    process.exit(0);
  }, 2000);
}).catch(e => console.error('ERR:', e.message));
" 2>&1