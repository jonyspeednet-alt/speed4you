const fs = require('fs');
const path = require('path');

const deployDir = 'server-deploy';
const frontendBuildDir = 'frontend/dist';
const backendDir = 'backend';

// Clear or create the deployment directory
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir, { recursive: true });

// Copy frontend build to deployment directory
const frontendDest = path.join(deployDir, 'dist');
fs.cpSync(frontendBuildDir, frontendDest, { recursive: true });

// Copy backend to deployment directory
const backendDest = path.join(deployDir, 'backend');
fs.cpSync(backendDir, backendDest, { recursive: true });

console.log('Deployment package prepared successfully.');
