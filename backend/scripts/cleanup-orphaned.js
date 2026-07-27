const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const requestedDir = '/var/www/html/Requested';
const keepDirs = ['Movies', 'Series'];

console.log('Before:');
console.log(execSync('du -sh ' + requestedDir, { encoding: 'utf8' }).trim());

const items = fs.readdirSync(requestedDir);
let deleted = 0;

for (const item of items) {
  if (keepDirs.includes(item)) continue;
  
  const fullPath = path.join(requestedDir, item);
  const stat = fs.statSync(fullPath);
  
  if (stat.isDirectory()) {
    console.log(`Deleting dir: ${item}`);
    try {
      execSync(`rm -rf "${fullPath}"`, { encoding: 'utf8', timeout: 60000 });
      deleted++;
    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 80)}`);
    }
  } else {
    console.log(`Deleting file: ${item}`);
    try {
      fs.unlinkSync(fullPath);
      deleted++;
    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 80)}`);
    }
  }
}

console.log(`\nDeleted ${deleted} items`);
console.log('\nAfter:');
console.log(execSync('du -sh ' + requestedDir, { encoding: 'utf8' }).trim());
console.log(execSync('ls ' + requestedDir, { encoding: 'utf8' }).trim());
