SELECT id, payload->>'title' as title,
  payload->'seasons'->0->>'sourcePath' as season0_path,
  payload->'seasons'->0->'episodes'->0->>'sourcePath' as ep1_path
FROM content_catalog WHERE id=32690;
