import sys

with open("frontend/src/pages/HomePage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("""function pickFeatured(explicitFeatured, latestItems, popularItems, trendingItems) {
  const featuredCandidate = explicitFeatured && explicitFeatured.id ? normalizeItem(explicitFeatured) : null;
  if (featuredCandidate?.id) {
    return featuredCandidate;
  }

  const featuredPool = rotateItems(
    mergePools(latestItems.slice(0, 10), trendingItems.slice(0, 10), popularItems.slice(0, 10)),
    createRotationSeed('featured'),
    1,
  );
  const enrichedCandidate = featuredPool.find((item) => item.poster || item.backdrop || item.description);
  if (enrichedCandidate) {
    return enrichedCandidate;
  }

  if (popularItems[0]) {
    return popularItems[0];
  }

  return null;
}""", """function pickFeatured(explicitFeatured, latestItems, popularItems, trendingItems) {
  const pool = rotateItems(
    mergePools(latestItems.slice(0, 10), trendingItems.slice(0, 10), popularItems.slice(0, 10)),
    createRotationSeed('featured'),
    1,
  );
  const validItems = pool.filter((item) => item.poster || item.backdrop || item.description);
  const selected = validItems.slice(0, 5);

  const featuredCandidate = explicitFeatured && explicitFeatured.id ? normalizeItem(explicitFeatured) : null;
  if (featuredCandidate?.id) {
    return [featuredCandidate, ...selected.filter((i) => String(i.id) !== String(featuredCandidate.id))].slice(0, 5);
  }

  if (selected.length > 0) {
    return selected;
  }

  if (popularItems[0]) {
    return [popularItems[0]];
  }

  return [];
}""")

content = content.replace("""  const continueIds = normalizedContinueWatching.map((item) => item.id);
  const featuredItem = pickFeatured(featured, latestItems, popularItems, trendingItems);
  const featuredId = featuredItem?.id ? [featuredItem.id] : [];""", """  const continueIds = normalizedContinueWatching.map((item) => item.id);
  const featuredItems = pickFeatured(featured, latestItems, popularItems, trendingItems);
  const featuredId = featuredItems.map((item) => item.id);""")

with open("frontend/src/pages/HomePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)
