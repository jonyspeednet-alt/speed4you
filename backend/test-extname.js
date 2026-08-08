const path = require('path');

const filename = 'Musafir.Cafe.S01E01.720p..mkv';
const ext = path.extname(filename).toLowerCase();
console.log('Filename:', filename);
console.log('Extension:', ext);
console.log('Is .mkv?', ext === '.mkv');
