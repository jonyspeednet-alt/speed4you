SELECT id, title, content_type, source_root_id FROM content_catalog 
WHERE title ILIKE '%Maamla%' 
  AND content_type = 'series';
