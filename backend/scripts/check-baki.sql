-- Find all items with no sourcePath or sourcePath pointing to missing files
SELECT id, title, content_type, status, payload->>'sourcePath' as sp
FROM content_catalog 
WHERE status = 'published'
  AND (payload->>'sourcePath' IS NULL OR payload->>'sourcePath' = '' OR payload->>'sourcePath' LIKE '%DELETED%')
ORDER BY title
LIMIT 50;
