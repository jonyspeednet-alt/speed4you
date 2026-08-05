-- Check series payload structure for seasons/episodes
SELECT id, title, content_type, 
  payload->>'seasons' as seasons,
  left(payload::text, 500) as payload_preview
FROM content_catalog 
WHERE id = 32634;
