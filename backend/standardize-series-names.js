const fs = require('fs');
const path = require('path');

const seriesPath = '/var/www/html/Requested/Series';

const standardizationRules = [
  { pattern: /\./g, replacement: ' ' },
  { pattern: /^the art of sarah/i, replacement: 'The Art of Sarah' },
  { pattern: /^batman\.caped\.crusader/i, replacement: 'Batman Caped Crusader' },
  { pattern: /^taskaree the\.smugglers web/i, replacement: 'Taskaree The Smugglers Web' },
  { pattern: /\s*\(2026\)/g, replacement: ' (2026)' },
  { pattern: /\s+/g, replacement: ' ' },
  { pattern: /^\s+|\s+$/g, replacement: '' },
];

function standardizeFolderName(folderName) {
  let newName = folderName;
  for (const rule of standardizationRules) {
    newName = newName.replace(rule.pattern, rule.replacement);
  }
  return newName.trim();
}

console.log('=== Series Folder Standardization ===');

const folders = fs.readdirSync(seriesPath);
console.log('Total folders:', folders.length);

const needsStandardization = [];

for (const folder of folders) {
  const standardizedName = standardizeFolderName(folder);
  if (standardizedName !== folder) {
    needsStandardization.push({
      original: folder,
      standardized: standardizedName
    });
  }
}

console.log('Folders needing standardization:', needsStandardization.length);
console.log('Standardization plan:');
needsStandardization.forEach(item => {
  console.log(item.original + ' → ' + item.standardized);
});

if (needsStandardization.length > 0) {
  console.log('=== Applying Standardization ===');
  
  for (const item of needsStandardization) {
    const oldPath = path.join(seriesPath, item.original);
    const newPath = path.join(seriesPath, item.standardized);
    
    try {
      if (fs.existsSync(newPath)) {
        console.log('SKIP: ' + item.standardized + ' already exists');
      } else {
        fs.renameSync(oldPath, newPath);
        console.log('RENAMED: ' + item.original + ' → ' + item.standardized);
      }
    } catch (error) {
      console.log('ERROR: Failed to rename ' + item.original + ': ' + error.message);
    }
  }
  
  console.log('=== Standardization Complete ===');
} else {
  console.log('No folders need standardization');
}

process.exit(0);
