UPDATE content_catalog SET 
  status = 'published',
  metadata_status = 'matched',
  published_at = NOW()
WHERE id = 33957;
