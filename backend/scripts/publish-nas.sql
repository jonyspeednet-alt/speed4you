-- Publish all NAS-recovered items
UPDATE content_catalog SET status = 'published', payload = jsonb_set(payload, '{metadataStatus}', '"matched"') WHERE id IN (
  32878, 32879, 32880, 32881, 32883, 32871, 32884, 32885, 32886, 32887, 32888, 32872, 32889, 32891
);

-- Also find Edge of Tomorrow, The Martian, Man from UNCLE, Big Short, Sicario
SELECT id, title, payload->>'sourcePath' as sp, status
FROM content_catalog 
WHERE title ILIKE '%Edge of Tomorrow%'
   OR title ILIKE '%The Martian%'
   OR title ILIKE '%Man from%'
   OR title ILIKE '%Big Short%'
   OR title ILIKE '%Sicario%'
   OR title ILIKE '%Star Wars%Force%'
ORDER BY title;
