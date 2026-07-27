-- Publish remaining NAS items
UPDATE content_catalog SET status = 'published', payload = jsonb_set(payload, '{metadataStatus}', '"matched"') WHERE id IN (32882, 32890, 32869);

-- Check remaining missing
SELECT id, title, payload->>'sourcePath' as sp, status
FROM content_catalog 
WHERE title ILIKE '%Big Short%'
   OR title ILIKE '%Sicario%'
   OR title ILIKE '%Mad Max%Fury%'
   OR title ILIKE '%Star Wars%Force%'
   OR title ILIKE '%Man from UNCLE%'
ORDER BY title;
