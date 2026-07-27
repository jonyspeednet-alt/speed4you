-- Total count of published items with no sourcePath
SELECT COUNT(*) as no_sourcepath FROM content_catalog 
WHERE status = 'published' 
  AND (payload->>'sourcePath' IS NULL OR payload->>'sourcePath' = '');

-- Total published
SELECT COUNT(*) as total_published FROM content_catalog WHERE status = 'published';

-- Total draft
SELECT COUNT(*) as total_draft FROM content_catalog WHERE status = 'draft';

-- All no-sourcePath items (full list)
SELECT id, title, content_type FROM content_catalog 
WHERE status = 'published' 
  AND (payload->>'sourcePath' IS NULL OR payload->>'sourcePath' = '')
ORDER BY content_type, title;
