const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4100,
  path: '/portal-api/api/admin/health',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Try to trigger graceful shutdown via admin API
const req = http.request(options, (res) => {
  console.log('Server is running, PID:', res.headers['x-process-pid'] || 'unknown');
  
  // Try to find the process and send SIGTERM
  const { exec } = require('child_process');
  exec('pkill -f "node.*isp-portal" --signal SIGTERM', (error, stdout, stderr) => {
    if (error) {
      console.log('Error sending SIGTERM:', error.message);
      console.log('Process might need manual restart');
    } else {
      console.log('SIGTERM sent successfully');
      console.log('Systemd should auto-restart the service');
    }
  });
});

req.on('error', (error) => {
  console.error('Error connecting to server:', error.message);
  console.log('Server might not be running');
});

req.end();
