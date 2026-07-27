SELECT id, title, payload->>'sourcePath' as sp, status
FROM content_catalog 
WHERE title IN ('The Grand Budapest Hotel', 'Hacksaw Ridge', 'Mad Max: Fury Road', 'Inside Out', 'Spotlight', 'Birdman', 'Nightcrawler', 'Focus', 'Sicario', 'The Hateful Eight', 'The Revenant', 'The Big Short', 'Star Wars: The Force Awakens', 'Room', 'The Man from U.N.C.L.E.', 'Creed', 'Bridge of Spies', 'Brooklyn')
ORDER BY title;

-- Also check with fuzzy match
SELECT id, title, payload->>'sourcePath' as sp, status
FROM content_catalog 
WHERE title ILIKE '%Grand Budapest%'
   OR title ILIKE '%Hacksaw Ridge%'
   OR title ILIKE '%Mad Max%Fury%'
   OR title ILIKE '%Inside Out' AND title NOT LIKE '%2%'
   OR title ILIKE '%Spotlight%' AND title NOT LIKE '%TV%'
   OR title ILIKE '%Birdman%' AND title NOT LIKE '%TV%'
   OR title ILIKE '%Nightcrawler%'
   OR title ILIKE '%Man from UNCLE%'
   OR title ILIKE '%Creed%' AND title NOT LIKE '%III%'
   OR title ILIKE '%Bridge of Spies%'
   OR title ILIKE '%Brooklyn%' AND title NOT LIKE '%Nine%'
   OR title ILIKE '%Big Short%'
   OR title ILIKE '%Hateful%'
   OR title ILIKE '%Revenant%'
   OR title ILIKE '%Force Awakens%'
   OR title ILIKE '%Sicario%'
   OR title = 'Room'
   OR title = 'Focus'
ORDER BY title;
