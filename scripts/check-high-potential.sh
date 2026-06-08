#!/bin/bash
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== HIGH POTENTIAL - ALL ENTRIES ==="
$PG -c "
SELECT
  id,
  status,
  source_type,
  source_root_id,
  duplicate_count,
  payload->>'title' AS title,
  payload->>'sourcePath' AS source_path,
  payload->>'scanSignature' AS scan_sig,
  payload->>'seasonCount' AS seasons,
  payload->>'episodeCount' AS episodes,
  payload->>'updatedAt' AS updated_at
FROM content_catalog
WHERE LOWER(payload->>'title') LIKE '%high potential%'
ORDER BY id
"

echo ""
echo "=== SCAN SIGNATURES (to find what made duplicates) ==="
$PG -c "
SELECT
  id,
  payload->>'sourcePath' AS source_path,
  payload->>'scanSignature' AS scan_signature,
  payload->>'lastScanRunId' AS scan_run_id
FROM content_catalog
WHERE LOWER(payload->>'title') LIKE '%high potential%'
ORDER BY id
"
