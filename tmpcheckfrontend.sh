echo "=== index.html scripts ==="
grep -o 'src="[^"]*"' /var/www/speed4you.net/index.html | head -10
echo "=== PipelinePage size ==="
wc -c /var/www/speed4you.net/assets/PipelinePage-1277cec1.js
echo "=== Contains WorkerPanel? ==="
grep -c 'WorkerPanel' /var/www/speed4you.net/assets/PipelinePage-1277cec1.js 2>/dev/null || echo "no WorkerPanel"
echo "=== Contains startScanner? ==="
grep -c 'startScanner\|scanner/start' /var/www/speed4you.net/assets/PipelinePage-1277cec1.js 2>/dev/null || echo "no scanner start"
echo "=== Checking for JS syntax ==="
node --check /var/www/speed4you.net/assets/PipelinePage-1277cec1.js 2>&1 | head -3 || echo "Not valid JS (expected for bundled code)"
echo "=== AdminLayout has Pipeline link? ==="
grep -c 'pipeline' /var/www/speed4you.net/assets/AdminLayout-45bbcc1d.js 2>/dev/null || echo "no pipeline link"
echo "=== Index page test ==="
curl -s -o /dev/null -w '%{http_code}' https://speed4you.net/admin/pipeline 2>/dev/null; echo