const fs = require('fs');
const path = require('path');

const contentPath = '/var/www/html/Requested/Series';
const musafirPath = path.join(contentPath, 'Musafir Cafe (2026)');

console.log('=== Permission Check for Musafir Cafe ===');
console.log('Path:', musafirPath);
console.log('');

try {
  const stats = fs.statSync(musafirPath);
  console.log('Directory exists: YES');
  console.log('UID:', stats.uid);
  console.log('GID:', stats.gid);
  console.log('Mode:', stats.mode.toString(8));
  console.log('Permissions:', (stats.mode & parseInt('777', 8)).toString(8));
  
  // Check if readable
  try {
    fs.accessSync(musafirPath, fs.constants.R_OK);
    console.log('Readable by current user: YES');
  } catch (err) {
    console.log('Readable by current user: NO');
    console.log('Error:', err.message);
  }
  
  // List files in directory
  try {
    const files = fs.readdirSync(musafirPath);
    console.log('Files in directory:', files.length);
    console.log('Files:', files);
  } catch (err) {
    console.log('Cannot list files:', err.message);
  }
  
} catch (err) {
  console.log('Directory exists: NO');
  console.log('Error:', err.message);
}

console.log('');
console.log('=== Required Permissions ===');
console.log('User: www-data (UID 33)');
console.log('Group: www-data (GID 33)');
console.log('Directory permissions: 755');
console.log('File permissions: 644');
console.log('');
console.log('=== Fix Command ===');
console.log('sudo chown -R www-data:www-data "/var/www/html/Requested/Series/Musafir Cafe (2026)"');
console.log('sudo chmod -R 755 "/var/www/html/Requested/Series/Musafir Cafe (2026)"');
console.log('find "/var/www/html/Requested/Series/Musafir Cafe (2026)" -type f -exec chmod 644 {} +');

process.exit(0);
