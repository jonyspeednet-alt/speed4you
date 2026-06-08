#!/bin/bash
echo "=== NGINX CONFIG CHECK ==="
cat /etc/nginx/sites-enabled/speed4you.net | grep -A5 -B2 "New_Movies_1\|location\|root\|alias" | head -60

echo ""
echo "=== ACTUAL FILE PATH ON DISK ==="
ls -la "/var/www/html/New_Movies_1/" | grep -i "Matka%20King%202026%20S01E01" | head -3

echo ""
echo "=== TRY DIFFERENT URL FORMATS ==="
# The file on disk has literal %20 in the name
# nginx may interpret the URL differently

# Test 1: literal percent signs in URL
curl -s -o /dev/null -w "Test1 (double-encoded): %{http_code}\n" --range 0-1023 \
  "http://localhost/New_Movies_1/Matka%2520King%25202026%2520S01E01%2520AMZN%2520Hindi%2520%2528ORG%25205.1%2529%25201080p%2520WEB-DL%2520x264%2520Multi%2520Subs.mkv"

# Test 2: single encoded (standard)
curl -s -o /dev/null -w "Test2 (single-encoded): %{http_code}\n" --range 0-1023 \
  "http://localhost/New_Movies_1/Matka%20King%202026%20S01E01%20AMZN%20Hindi%20%28ORG%205.1%29%201080p%20WEB-DL%20x264%20Multi%20Subs.mkv"

# Test 3: decoded (spaces in URL)
curl -s -o /dev/null -w "Test3 (decoded spaces): %{http_code}\n" --range 0-1023 \
  "http://localhost/New_Movies_1/Matka King 2026 S01E01 AMZN Hindi (ORG 5.1) 1080p WEB-DL x264 Multi Subs.mkv"

echo ""
echo "=== WHAT nginx sees as root dir ==="
nginx -T 2>/dev/null | grep -A3 "New_Movies\|server_name.*speed4you\|root\|alias" | head -40

echo ""
echo "=== CHECK IF NGINX HAS encode_uri ==="
nginx -T 2>/dev/null | grep -i "encode\|decode\|uri" | head -10
