#!/bin/bash
# Fix double-URL-encoded videoUrl in episode records
# The files on disk have names like "Matka%20King..." (literal percent signs)
# But the videoUrl stored in DB has them double-encoded as "Matka%2520King..."
# We need to fix: %2520 → %20, %2528 → %28, %2529 → %29, etc.

PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== STEP 1: Show current videoUrl for item 14132 ==="
$PG -c "
SELECT
  ep->>'number' AS ep,
  ep->>'videoUrl' AS video_url
FROM content_catalog,
  jsonb_array_elements(payload->'seasons') AS s,
  jsonb_array_elements(s->'episodes') AS ep
WHERE id = 14132
ORDER BY (ep->>'number')::int
"

echo ""
echo "=== STEP 2: Count all items with double-encoded URLs ==="
$PG -c "
SELECT COUNT(*) as items_with_double_encoding
FROM content_catalog
WHERE payload::text LIKE '%25%25%'
   OR payload::text LIKE '%2525%'
   OR payload::text LIKE '%252528%'
   OR payload::text LIKE '%252520%'
"

echo ""
echo "=== STEP 3: Show HTTP test with correct URL ==="
echo "Testing direct nginx access..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --range 0-1023 \
  "http://localhost/New_Movies_1/Matka%20King%202026%20S01E01%20AMZN%20Hindi%20%28ORG%205.1%29%201080p%20WEB-DL%20x264%20Multi%20Subs.mkv"

echo ""
echo "=== STEP 4: Fix double-encoded videoUrl in item 14132 ==="
# We need to update the seasons JSON to fix the videoUrl for each episode
# %2520 → %20, %2528 → %28, %2529 → %29

$PG -c "
UPDATE content_catalog
SET payload = (
  SELECT jsonb_set(
    payload,
    '{seasons}',
    (
      SELECT jsonb_agg(
        jsonb_set(
          s,
          '{episodes}',
          (
            SELECT jsonb_agg(
              jsonb_set(
                ep,
                '{videoUrl}',
                to_jsonb(
                  replace(replace(replace(replace(replace(
                    ep->>'videoUrl',
                    '%2528', '%28'),
                    '%2529', '%29'),
                    '%2520', '%20'),
                    '%2521', '%21'),
                    '%252C', '%2C')
                )
              )
            )
            FROM jsonb_array_elements(s->'episodes') AS ep
          )
        )
      )
      FROM jsonb_array_elements(payload->'seasons') AS s
    )
  )
)
WHERE id = 14132
RETURNING id, payload->>'title' AS title
"

echo ""
echo "=== STEP 5: Verify fixed videoUrl ==="
$PG -c "
SELECT
  ep->>'number' AS ep,
  ep->>'videoUrl' AS video_url
FROM content_catalog,
  jsonb_array_elements(payload->'seasons') AS s,
  jsonb_array_elements(s->'episodes') AS ep
WHERE id = 14132
ORDER BY (ep->>'number')::int
"

echo ""
echo "=== STEP 6: Test HTTP access after fix ==="
EP1_URL=$($PG -t -c "
SELECT ep->>'videoUrl'
FROM content_catalog,
  jsonb_array_elements(payload->'seasons') AS s,
  jsonb_array_elements(s->'episodes') AS ep
WHERE id = 14132
ORDER BY (ep->>'number')::int
LIMIT 1
" | xargs)

echo "Testing: http://localhost${EP1_URL}"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --range 0-1023 "http://localhost${EP1_URL}"
