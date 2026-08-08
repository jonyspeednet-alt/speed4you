/**
 * test_unicode_clean.js
 * Tests NFC Unicode normalization on Indic script filenames
 */
const title = 'হাওয়া (2022)';
console.log('Original string:', title);
console.log('Original length:', title.length);
console.log('Original charCodes:', [...title].map(c => c.charCodeAt(0)));

const nfc = title.normalize('NFC');
console.log('NFC normalized:', nfc);

const cleaned = nfc.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/\((19|20)\d{2}\)/g, '').trim();
console.log('Cleaned:', cleaned);
