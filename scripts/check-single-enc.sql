-- Count movies where sourcePath contains '%' but videoUrl is not double-encoded
SELECT 'movies' as type, COUNT(*) 
FROM content_catalog 
WHERE (strpos(payload->>'sourcePath', '%20') > 0 OR strpos(payload->>'sourcePath', '%28') > 0 OR strpos(payload->>'sourcePath', '%29') > 0)
  AND (
    (strpos(payload->>'sourcePath', '%20') > 0 AND strpos(payload->>'videoUrl', '%2520') = 0) OR
    (strpos(payload->>'sourcePath', '%28') > 0 AND strpos(payload->>'videoUrl', '%2528') = 0) OR
    (strpos(payload->>'sourcePath', '%29') > 0 AND strpos(payload->>'videoUrl', '%2529') = 0)
  );

-- Count series where episode sourcePath contains '%' but episode videoUrl is not double-encoded
SELECT 'series_episodes' as type, COUNT(*)
FROM content_catalog,
     jsonb_array_elements(payload->'seasons') AS s,
     jsonb_array_elements(s->'episodes') AS ep
WHERE (strpos(ep->>'sourcePath', '%20') > 0 OR strpos(ep->>'sourcePath', '%28') > 0 OR strpos(ep->>'sourcePath', '%29') > 0)
  AND (
    (strpos(ep->>'sourcePath', '%20') > 0 AND strpos(ep->>'videoUrl', '%2520') = 0) OR
    (strpos(ep->>'sourcePath', '%28') > 0 AND strpos(ep->>'videoUrl', '%2528') = 0) OR
    (strpos(ep->>'sourcePath', '%29') > 0 AND strpos(ep->>'videoUrl', '%2529') = 0)
  );
