-- Check drafts that might be CTG downloads not yet published
SELECT id, title, content_type, status, payload->>'sourcePath' as sp
FROM content_catalog 
WHERE status = 'draft'
ORDER BY title;
