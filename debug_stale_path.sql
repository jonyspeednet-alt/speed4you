-- Check episodes for series 32634 (The Terror) as a sample
SELECT cc.id, cc.title, cc.content_type, cc.payload->>'sourcePath' as series_path,
  e.id as ep_id, e.title as ep_title, e.payload->>'sourcePath' as ep_source,
  e.payload->>'videoUrl' as ep_video,
  e.payload->>'episodeNumber' as ep_num,
  e.payload->>'seasonNumber' as season_num
FROM content_catalog cc
JOIN content_catalog e ON e.payload->>'seriesId' = cc.id::text
WHERE cc.id = 32634
ORDER BY (e.payload->>'seasonNumber')::int, (e.payload->>'episodeNumber')::int
LIMIT 20;
