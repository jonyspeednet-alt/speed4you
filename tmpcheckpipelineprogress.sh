ps aux | grep pipeline-runner | grep -v grep
echo SEP
curl -s http://localhost:4100/api/admin/pipeline/status 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30
echo SEP
curl -s http://localhost:4100/api/admin/pipeline/log?limit=20 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30
echo SEP
ls -la /var/www/html/Extra_Storage/portal-media-cache/*.mp4 2>/dev/null | wc -l
