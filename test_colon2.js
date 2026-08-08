// Test with updated title
function cleanSearchTitle(value) {
  let normalized = String(value || '').replace(/\.[a-z0-9]{2,4}$/i, '');
  normalized = normalized.replace(/[._]/g, ' ');
  
  let cleaned = normalized
    .replace(/\((19|20)\d{2}\)/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    // Preserve colons between numbers (e.g., "13:14") - they might be part of the title
    // But remove other colons (at end of words, followed by spaces, etc.)
    .replace(/:(?=\s|$)/g, ' ')
    .replace(/\s*[-–—]+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

const updatedTitle = "13:14: El Reto de Ayudar";
const tmdbOriginalTitle = "13:14: El Reto de Ayudar";

console.log('Updated title cleaned:', cleanSearchTitle(updatedTitle));
console.log('TMDb original_title cleaned:', cleanSearchTitle(tmdbOriginalTitle));
console.log('Exact match:', cleanSearchTitle(updatedTitle) === cleanSearchTitle(tmdbOriginalTitle));
