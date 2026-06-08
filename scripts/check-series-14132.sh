#!/bin/bash
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== ITEM 14132 DETAILS ==="
$PG -c "
SELECT
  id,
  status,
  source_type,
  source_root_id,
  payload->>'title' AS title,
  payload->>'type' AS type,
  payload->>'sourcePath' AS source_path,
  payload->>'sourcePublicPath' AS public_path,
  payload->>'videoUrl' AS video_url,
  payload->>'seasonCount' AS seasons,
  payload->>'episodeCount' AS episodes
FROM content_catalog
WHERE id = 14132
"

echo ""
echo "=== SEASONS & EPISODES (first few) ==="
$PG -c "
SELECT
  id,
  payload->>'title' AS title,
  jsonb_array_length(COALESCE(payload->'seasons', '[]'::jsonb)) AS season_count,
  payload->'seasons'->0->>'number' AS s1_num,
  jsonb_array_length(COALESCE(payload->'seasons'->0->'episodes', '[]'::jsonb)) AS s1_ep_count,
  payload->'seasons'->0->'episodes'->0->>'title' AS ep1_title,
  payload->'seasons'->0->'episodes'->0->>'videoUrl' AS ep1_video_url,
  payload->'seasons'->0->'episodes'->0->>'sourcePath' AS ep1_source_path
FROM content_catalog
WHERE id = 14132
"
