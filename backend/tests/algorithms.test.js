const test = require('node:test');
const assert = require('node:assert/strict');

// Algorithmic helpers and logic to test
function parseSubnet(ip) {
  const normalizedIp = String(ip || '').split(',')[0].trim();
  if (normalizedIp.includes(':')) {
    const segments = normalizedIp.split(':');
    return segments.slice(0, Math.min(4, segments.length)).join(':');
  } else {
    const octets = normalizedIp.split('.');
    return octets.slice(0, Math.min(3, octets.length)).join('.');
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000000007;
  }
  return hash;
}

function computeWeightedPopularityScore(rating, trendingScore) {
  const r = Number(rating || 0);
  const t = Number(trendingScore || 0);
  return r * 0.7 + Math.log(1.0 + t) * 0.5;
}

function computeSimilarityScore(seed, candidate) {
  const seedGenres = Array.isArray(seed.genres)
    ? seed.genres.map(g => String(g || '').trim().toLowerCase())
    : (seed.genre ? [String(seed.genre).trim().toLowerCase()] : []);
    
  const seedTags = Array.isArray(seed.tags)
    ? seed.tags.map(t => String(t || '').trim().toLowerCase())
    : [];

  const seedCategory = String(seed.category || '').trim().toLowerCase();
  const seedLanguage = String(seed.language || '').trim().toLowerCase();

  const itemGenres = Array.isArray(candidate.genres)
    ? candidate.genres.map(g => String(g || '').trim().toLowerCase())
    : (candidate.genre ? [String(candidate.genre).trim().toLowerCase()] : []);
    
  const itemTags = Array.isArray(candidate.tags)
    ? candidate.tags.map(t => String(t || '').trim().toLowerCase())
    : [];

  const genreOverlap = seedGenres.filter(g => itemGenres.includes(g)).length;
  const tagOverlap = seedTags.filter(t => itemTags.includes(t)).length;
  
  const categoryMatch = String(candidate.category || '').trim().toLowerCase() === seedCategory ? 1 : 0;
  const languageMatch = String(candidate.language || '').trim().toLowerCase() === seedLanguage ? 1 : 0;

  const ratingVal = Number(candidate.rating || 0);

  return (genreOverlap * 4.0) + (tagOverlap * 2.5) + (categoryMatch * 2.0) + (languageMatch * 1.0) + (ratingVal * 0.15);
}

// 1. IP Subnet Parsing Tests
test('IP Subnet parsing extracts IPv4 /24 prefix correctly', () => {
  assert.equal(parseSubnet('192.168.1.15'), '192.168.1');
  assert.equal(parseSubnet('10.0.0.1, 192.168.1.1'), '10.0.0'); // Handles x-forwarded-for lists
});

test('IP Subnet parsing extracts IPv6 /64 prefix correctly', () => {
  assert.equal(parseSubnet('2001:db8:85a3:8d3:1319:8a2e:370:7348'), '2001:db8:85a3:8d3');
  assert.equal(parseSubnet('::1'), '::1');
});

// 2. Polynomial Rolling Hash Tests
test('hashString generates deterministic integer hash values', () => {
  const hash1 = hashString('192.168.1');
  const hash2 = hashString('192.168.1');
  const hash3 = hashString('192.168.2');

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.ok(Number.isInteger(hash1));
});

// 3. Weighted Popularity Math Tests
test('computeWeightedPopularityScore balances high rating and high view volume', () => {
  // A niche movie: 9.5 rating, 0 views
  const nicheScore = computeWeightedPopularityScore(9.5, 0); // 9.5 * 0.7 + ln(1)*0.5 = 6.65
  assert.ok(Math.abs(nicheScore - 6.65) < 0.00001);

  // A popular blockbuster: 8.5 rating, 100 views
  const blockbusterScore = computeWeightedPopularityScore(8.5, 100); // 8.5 * 0.7 + ln(101)*0.5 = 5.95 + 2.307 = 8.257
  assert.ok(blockbusterScore > nicheScore); // Blockbuster correctly rises to top of Portal Favorites

  // An average popular movie: 5.0 rating, 20 views
  const averageScore = computeWeightedPopularityScore(5.0, 20); // 5.0 * 0.7 + ln(21)*0.5 = 3.5 + 1.52 = 5.02
  assert.ok(averageScore < nicheScore); // Rating quality is still respected
});

// 4. Content similarity engine tests
test('computeSimilarityScore correctly weights overlapping genres, tags and metadata', () => {
  const seed = {
    genres: ['Sci-Fi', 'Action'],
    tags: ['space', 'time-travel'],
    category: 'movies',
    language: 'English',
    rating: 8.5
  };

  const highlySimilar = {
    genres: ['Sci-Fi', 'Adventure'], // 1 genre match
    tags: ['space', 'aliens'], // 1 tag match
    category: 'movies', // category match
    language: 'English', // language match
    rating: 9.0
  };

  const unrelated = {
    genres: ['Drama', 'Romance'],
    tags: ['love', 'wedding'],
    category: 'movies',
    language: 'Spanish',
    rating: 7.0
  };

  const scoreSimilar = computeSimilarityScore(seed, highlySimilar);
  const scoreUnrelated = computeSimilarityScore(seed, unrelated);

  // similar = 1*4.0 (genre) + 1*2.5 (tag) + 1*2.0 (category) + 1*1.0 (language) + 9*0.15 (rating) = 4.0 + 2.5 + 2.0 + 1.0 + 1.35 = 10.85
  assert.equal(scoreSimilar, 10.85);

  // unrelated = 0 + 0 + 1*2.0 (category) + 0 + 7*0.15 = 2.0 + 1.05 = 3.05
  assert.equal(scoreUnrelated, 3.05);

  assert.ok(scoreSimilar > scoreUnrelated);
});

// 5. Era and Decade parsing logic tests
function parseYearFilter(yearInput) {
  const yearStr = String(yearInput).trim();
  if (/^\d{4}$/.test(yearStr)) {
    return { type: 'exact', value: Number(yearStr) };
  } else if (/^\d{4}s$/.test(yearStr)) {
    const decadeStart = Number(yearStr.slice(0, 4));
    const decadeEnd = decadeStart + 9;
    return { type: 'range', start: decadeStart, end: decadeEnd };
  } else if (yearStr.toLowerCase() === 'pre-1990s' || yearStr.toLowerCase() === 'pre-1990') {
    return { type: 'legacy', max: 1990 };
  }
  return { type: 'invalid' };
}

test('parseYearFilter parses exact years, decades, and pre-1990s correctly', () => {
  assert.deepEqual(parseYearFilter('2025'), { type: 'exact', value: 2025 });
  assert.deepEqual(parseYearFilter('2020s'), { type: 'range', start: 2020, end: 2029 });
  assert.deepEqual(parseYearFilter('1990s'), { type: 'range', start: 1990, end: 1999 });
  assert.deepEqual(parseYearFilter('Pre-1990s'), { type: 'legacy', max: 1990 });
  assert.deepEqual(parseYearFilter('pre-1990'), { type: 'legacy', max: 1990 });
  assert.deepEqual(parseYearFilter('abc'), { type: 'invalid' });
});

