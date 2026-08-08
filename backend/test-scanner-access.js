const fs = require('fs');
const path = require('path');

const seriesPath = '/var/www/html/Requested/Series/Musafir Cafe (2026)';
const seasonPath = path.join(seriesPath, 'S1');

console.log('=== Testing Scanner Access to Musafir Cafe ===');
console.log('Series Path:', seriesPath);
console.log('Season Path:', seasonPath);
console.log('');

// Test 1: Can we list the season directory?
try {
  const seasonFiles = fs.readdirSync(seasonPath);
  console.log('✓ Can list season directory');
  console.log('  Files found:', seasonFiles.length);
  console.log('  Files:', seasonFiles);
} catch (err) {
  console.log('✗ Cannot list season directory');
  console.log('  Error:', err.message);
}

// Test 2: Can we read file stats for each file?
try {
  const seasonFiles = fs.readdirSync(seasonPath);
  console.log('');
  console.log('=== File Access Test ===');
  seasonFiles.forEach(file => {
    const filePath = path.join(seasonPath, file);
    try {
      const stats = fs.statSync(filePath);
      console.log('✓ ' + file + ': ' + stats.size + ' bytes, mode: ' + stats.mode.toString(8));
    } catch (err) {
      console.log('✗ ' + file + ': ' + err.message);
    }
  });
} catch (err) {
  console.log('Error reading files:', err.message);
}

// Test 3: Check if files are video files
try {
  const seasonFiles = fs.readdirSync(seasonPath);
  console.log('');
  console.log('=== Video File Detection ===');
  const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.webm'];
  const videoFiles = seasonFiles.filter(file => 
    videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
  );
  console.log('Video files found:', videoFiles.length);
  videoFiles.forEach(file => {
    console.log('  -', file);
  });
} catch (err) {
  console.log('Error detecting video files:', err.message);
}

console.log('');
console.log('=== Conclusion ===');
console.log('If all tests passed, the scanner should be able to access Musafir Cafe.');
console.log('If any test failed, permission fixes are needed.');

process.exit(0);
