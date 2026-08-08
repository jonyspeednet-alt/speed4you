UPDATE content_catalog SET 
  payload = jsonb_set(
    jsonb_set(
      payload,
      '{tmdbId}', '1017619'
    ),
    '{imdbId}', '"tt16292538"'
  ),
  status = 'published',
  metadata_status = 'matched',
  published_at = NOW()
WHERE id = 33957;
