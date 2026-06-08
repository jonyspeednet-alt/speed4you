#!/bin/bash
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== ALL EPISODES OF ITEM 14132 ==="
$PG -t -c "
SELECT
  ep->>'number' AS ep_num,
  ep->>'title' AS ep_title,
  ep->>'videoUrl' AS video_url,
  ep->>'sourcePath' AS source_path
FROM content_catalog,
  jsonb_array_elements(payload->'seasons') AS s,
  jsonb_array_elements(s->'episodes') AS ep
WHERE id = 14132
ORDER BY (ep->>'number')::int
"

echo ""
echo "=== CHECK FILE EXISTENCE ==="
$PG -t -c "
SELECT ep->>'sourcePath' AS source_path
FROM content_catalog,
  jsonb_array_elements(payload->'seasons') AS s,
  jsonb_array_elements(s->'episodes') AS ep
WHERE id = 14132
ORDER BY (ep->>'number')::int
" | while read -r path; do
  path=$(echo "$path" | xargs)  # trim
  if [ -z "$path" ]; then continue; fi
  # URL decode %28 → ( etc
  decoded=$(python3 -c "import urllib.parse, sys; print(urllib.parse.unquote(sys.argv[1]))" "$path" 2>/dev/null || echo "$path")
  if [ -f "$decoded" ]; then
    perm=$(stat -c "%a %U:%G" "$decoded" 2>/dev/null)
    size=$(du -sh "$decoded" 2>/dev/null | cut -f1)
    echo "✅ EXISTS [$perm] [$size] $decoded"
  else
    echo "❌ MISSING: $decoded"
  fi
done

echo ""
echo "=== CHECK NGINX CAN READ THE FOLDER ==="
ls -la "/var/www/html/New_Movies_1/" | head -5
echo "..."
ls -la "/var/www/html/New_Movies_1/" | grep -i "matka" || echo "No matka folder found at root"

echo ""
echo "=== HTTP ACCESS TEST (via nginx) ==="
ENCODED_URL="http://localhost/New_Movies_1/Matka%20King%202026%20S01E01%20AMZN%20Hindi%20%28ORG%205.1%29%201080p%20WEB-DL%20x264%20Multi%20Subs.mkv"
curl -s -o /dev/null -w "HTTP Status: %{http_code}, Size: %{size_download} bytes\n" --range 0-1023 "$ENCODED_URL"
