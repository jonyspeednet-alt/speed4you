const title = '13 14 el reto de ayudar';
console.log('Pattern test:', /\b\d+\s+\d+\b/.test(title));
console.log('Colon variation:', title.replace(/\b(\d+)\s+(\d+)\b/g, '$1:$2'));
