UPDATE content_catalog SET 
  payload = jsonb_set(
    jsonb_set(
      payload,
      '{tmdbId}', '1017619'
    ),
    '{metadataConfidence}', '100'
  ),
  metadata_status = 'matched'
WHERE id = 33957;
