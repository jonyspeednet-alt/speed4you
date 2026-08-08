/**
 * test_indic_clean.js
 * Tests cleanSearchTitle on non-Latin script titles like "हवा 2022", "कंठ 2019", "अतरंगी रे 2021"
 */
const { cleanSearchTitle } = require('../services/metadata-enricher');

const testTitles = [
  "হ ওয 2022",
  "কন ঠ 2019",
  "ট ক ট ক 2020",
  "अत कन चत कन 2020",
  "ख द ह फ ज 2020",
  "अ त म एक आख र सच 2021",
  "अतर ग र 2021",
  "आह न 2021",
  "क ई ज न न 2021",
  "ब ब ब स व स 2021",
  "Annabelle Comes Home 2019 Hindi Dubbed Blu Ray"
];

console.log('--- TESTING INDIC SCRIPTS IN CLEAN SEARCH TITLE ---');
testTitles.forEach(t => {
  console.log(`Original: "${t}" -> Cleaned: "${cleanSearchTitle(t)}"`);
});
