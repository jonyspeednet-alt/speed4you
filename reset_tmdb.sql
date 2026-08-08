UPDATE content_catalog SET 
  payload = jsonb_set(payload, '{tmdbId}', 'null'::jsonb),
  status = 'draft',
  metadata_status = 'not_found'
WHERE id = 33957;
