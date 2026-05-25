cat /home/speed4you/portal-app/backend/src/data/app_state.json | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps({k:v for k,v in d.items() if "pipeline" in k.lower() or "scanner" in k.lower() or "queue" in k.lower()}, indent=2)[:2000])'
echo "=== JOURNAL ==="
journalctl -u isp-portal.service --no-pager -n 50 | grep -i 'pipeline' | tail -20
echo "=== STDERR ==="
cat /tmp/pipeline-runner-err.log 2>/dev/null || echo no stderr log
cat /tmp/pipeline-runner-out.log 2>/dev/null || echo no stdout log
echo "=== DISCOVERED ==="
find /var/www/html/Extra_Storage/portal-media-cache/ -name "*.mp4" -newer /var/www/speed4you.net/index.html 2>/dev/null | head -10 || echo no new mp4