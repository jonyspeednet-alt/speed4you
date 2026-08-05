SELECT id, payload->>'title' as title,
  payload->'seasons'->0->'episodes'->0->>'sourcePath' as ep1_path,
  payload->'seasons'->0->'episodes'->0->>'videoUrl' as ep1_url
FROM content_catalog
WHERE id IN (32634, 32635, 32636, 32637, 32638)
ORDER BY id;
