const fs = require('fs');
const path = require('path');

const testPath = '/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p.mkv';

try {
  const stats = fs.statSync(testPath);
  console.log('File exists:', true);
  console.log('File size:', stats.size);
  console.log('File permissions:', stats.mode.toString(8));
  
  try {
    fs.accessSync(testPath, fs.constants.R_OK);
    console.log('Can read file:', true);
  } catch (readError) {
    console.log('Can read file:', false, readError.message);
  }
  
  // Test directory access
  const dirPath = '/var/www/html/Requested/Series/Musafir Cafe (2026)';
  const dirStats = fs.statSync(dirPath);
  console.log('Directory exists:', true);
  console.log('Directory permissions:', dirStats.mode.toString(8));
  
  try {
    fs.accessSync(dirPath, fs.constants.R_OK);
    console.log('Can read directory:', true);
  } catch (dirReadError) {
    console.log('Can read directory:', false, dirReadError.message);
  }
  
  // Test listing directory
  const files = fs.readdirSync(dirPath);
  console.log('Can list directory:', true);
  console.log('Directory contents:', files);
  
  console.log('✅ Scanner should be able to access this content');
} catch (error) {
  console.log('❌ Scanner cannot access this content');
  console.log('Error:', error.message);
}

process.exit(0);
