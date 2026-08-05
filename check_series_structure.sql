-- Check what columns reference series
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'content_catalog' 
ORDER BY ordinal_position;

-- Check a few episode items
SELECT id, title, content_type, payload->>'seriesId' as series_id, 
  payload->>'seasonNumber' as season, payload->>'episodeNumber' as episode,
  payload->>'sourcePath' as source_path
FROM content_catalog 
WHERE content_type = 'episode'
LIMIT 10;
