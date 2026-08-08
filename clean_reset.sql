UPDATE content_catalog SET 
  payload = jsonb_set(
    jsonb_set(
      payload,
      '{tmdbId}', 'null'::jsonb
    ),
    '{imdbId}', '""'::jsonb
  ),
  metadata_status = 'not_found',
  status = 'draft'
WHERE id = 33957;
