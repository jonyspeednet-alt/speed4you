#!/bin/bash
set -e

echo "=== 1. Kill all ffmpeg (cache + live) ==="
pkill -f "ffmpeg.*pipe:1" 2>/dev/null || true
pkill -f "ffmpeg.*\.part\.mp4" 2>/dev/null || true
echo "Done"

echo "=== 2. Delete old cache files (built with empty_moov) ==="
rm -f /var/www/html/Extra_Storage/portal-media-cache/*.mp4
echo "Done"

echo "=== 3. Kill enrichment script ==="
pkill -f "enrich-skipped" 2>/dev/null || true
echo "Done"

echo "=== 4. Restart backend ==="
sudo systemctl restart isp-entertainment-portal 2>/dev/null || sudo systemctl restart backend 2>/dev/null || echo "Service name not found, restart manually"

echo "=== 5. Restart nginx ==="
sudo nginx -s reload 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || echo "nginx reload skipped"

echo "=== Recovery complete ==="
echo "Run the enrichment script manually if needed:"
echo "  cd /home/speed4you/portal-app/backend && node scripts/enrich-skipped.js"
