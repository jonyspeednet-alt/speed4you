const { normalizeTitleKey } = require('./helpers');

function scoreSearchResult(item, query) {
  const normalizedQuery = normalizeTitleKey(query);
  const titleKey = normalizeTitleKey(item.title);
  const originalTitleKey = normalizeTitleKey(item.originalTitle);
  const categoryKey = normalizeTitleKey(item.category);
  const genreKey = normalizeTitleKey(item.genre);
  const languageKey = normalizeTitleKey(item.language);
  const collectionKey = normalizeTitleKey(item.collection);
  const descriptionKey = normalizeTitleKey(item.description);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const titleTokens = titleKey.split(' ').filter(Boolean);
  let score = 0;

  if (titleKey === normalizedQuery) score += 120;
  else if (titleKey.startsWith(normalizedQuery)) score += 90;
  else if (titleKey.includes(normalizedQuery)) score += 70;
  if (originalTitleKey === normalizedQuery) score += 110;
  else if (originalTitleKey.startsWith(normalizedQuery)) score += 84;
  else if (originalTitleKey.includes(normalizedQuery)) score += 64;

  queryTokens.forEach((token) => {
    if (titleTokens.includes(token)) score += 20;
    else if (titleTokens.some((entry) => entry.startsWith(token))) score += 12;
    if (originalTitleKey.includes(token)) score += 10;
    if (categoryKey.includes(token)) score += 8;
    if (genreKey.includes(token)) score += 7;
    if (languageKey.includes(token)) score += 6;
    if (collectionKey.includes(token)) score += 6;
    if (descriptionKey.includes(token)) score += 3;
  });

  if (categoryKey.includes(normalizedQuery)) score += 28;
  if (genreKey.includes(normalizedQuery)) score += 22;
  if (languageKey.includes(normalizedQuery)) score += 18;
  if (collectionKey.includes(normalizedQuery)) score += 18;
  if (descriptionKey.includes(normalizedQuery)) score += 12;
  score += Number(item.trendingScore || 0);
  score += Number(item.rating || 0) * 4;
  if (item.metadataStatus === 'matched') score += 8;
  if (item.metadataStatus === 'needs_review') score -= 8;
  if (item.metadataStatus === 'not_found') score -= 14;

  return score;
}

module.exports = {
  scoreSearchResult,
};
