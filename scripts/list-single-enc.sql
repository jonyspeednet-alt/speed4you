-- List movies needing fix
SELECT id, payload->>'title' as title, payload->>'videoUrl' as video_url, payload->>'sourcePath' as source_path 
FROM content_catalog 
WHERE (strpos(payload->>'sourcePath', '%20') > 0 OR strpos(payload->>'sourcePath', '%28') > 0 OR strpos(payload->>'sourcePath', '%29') > 0)
  AND (
    (strpos(payload->>'sourcePath', '%20') > 0 AND strpos(payload->>'videoUrl', '%2520') = 0) OR
    (strpos(payload->>'sourcePath', '%28') > 0 AND strpos(payload->>'videoUrl', '%2528') = 0) OR
    (strpos(payload->>'sourcePath', '%29') > 0 AND strpos(payload->>'videoUrl', '%2529') = 0)
  );

-- List series episodes needing fix
SELECT id, payload->>'title' as series_title, ep->>'title' as ep_title, ep->>'videoUrl' as ep_video_url, ep->>'sourcePath' as ep_source_path
FROM content_catalog,
     jsonb_array_elements(payload->'seasons') AS s,
     jsonb_array_elements(s->'episodes') AS ep
WHERE (strpos(ep->>'sourcePath', '%20') > 0 OR strpos(ep->>'sourcePath', '%28') > 0 OR strpos(ep->>'sourcePath', '%29') > 0)
  AND (
    (strpos(ep->>'sourcePath', '%20') > 0 AND strpos(ep->>'videoUrl', '%2520') = 0) OR
    (strpos(ep->>'sourcePath', '%28') > 0 AND strpos(ep->>'videoUrl', '%2528') = 0) OR
    (strpos(ep->>'sourcePath', '%29') > 0 AND strpos(ep->>'videoUrl', '%2529') = 0)
  );
