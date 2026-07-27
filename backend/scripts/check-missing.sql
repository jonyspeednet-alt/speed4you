SELECT id, title, payload->>'sourcePath' as sp, status
FROM content_catalog 
WHERE title ILIKE '%Big Short%'
   OR title ILIKE '%Sicario%'
   OR title ILIKE '%Star Wars%Force%'
   OR title ILIKE '%Man from%UNCLE%'
ORDER BY title;
