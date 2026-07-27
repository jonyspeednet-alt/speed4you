SELECT id, title, payload->>'sourcePath' as sp 
FROM content_catalog 
WHERE title ILIKE ANY(ARRAY[
  '%Grand Budapest%', '%Hacksaw%', '%Mad Max%', '%Inside Out%',
  '%Room%', '%Spotlight%', '%Birdman%', '%Edge of Tomorrow%',
  '%Nightcrawler%', '%Man from U.N.C.L.E%', '%Focus%', '%Brooklyn%',
  '%Creed%', '%Bridge of Spies%', '%Sicario%', '%The Martian%',
  '%Hateful Eight%', '%Revenant%', '%Big Short%', '%Force Awakens%'
])
AND status = 'published'
ORDER BY title;
