UPDATE content_catalog SET 
  payload = jsonb_set(
    jsonb_set(
      payload,
      '{tmdbId}', 'null'::jsonb
    ),
    '{metadataConfidence}', '0'::jsonb
  ),
  status = 'draft',
  metadata_status = 'not_found'
WHERE id = 33957;
