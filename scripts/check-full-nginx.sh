#!/bin/bash
echo "=== CHECK FULL NGINX CONFIG ==="
cat /etc/nginx/sites-enabled/speed4you.net

echo ""
echo "=== CHECK OTHER NGINX SITES ==="
ls /etc/nginx/sites-enabled/

echo ""
echo "=== TEST KNOWN-WORKING VIDEO URL (if any) ==="
# Try an English movie that should work
curl -s -o /dev/null -w "English_Movies test: %{http_code}\n" --range 0-1023 \
  "https://speed4you.net/English_Movies/2000/Mission%3A%20Impossible%20II%20(2000)"

echo ""
echo "=== CHECK data.speed4you.net nginx config ==="
cat /etc/nginx/sites-enabled/data.speed4you.net 2>/dev/null || echo "Not found"
ls /etc/nginx/sites-enabled/

echo ""
echo "=== CHECK ALL NGINX SERVER BLOCKS ==="
nginx -T 2>/dev/null | grep -E "server_name|root|alias|location|listen" | head -60
