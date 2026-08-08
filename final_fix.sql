UPDATE content_catalog SET 
  payload = jsonb_set(
    jsonb_set(
      payload,
      '{tmdbId}', '1017619'
    ),
    '{metadataConfidence}', '100'
  ),
  status = 'published',
  metadata_status = 'matched',
  published_at = NOW()
WHERE id = 33957;
