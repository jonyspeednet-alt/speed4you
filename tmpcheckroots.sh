cat /home/speed4you/portal-app/backend/src/data/scanner-roots.json 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); [print(f"  [{i}] {r.get("scanPath","?")} (enabled={r.get("enabled")})") for i,r in enumerate(d)]' 2>/dev/null
echo "---"
# Check which roots exist
cd /home/speed4you/portal-app/backend
node -e "
const { loadScannerRoots } = require('./src/data/store');
const fs = require('fs');
const roots = loadScannerRoots();
roots.forEach((r, i) => {
  const exists = r.scanPath ? fs.existsSync(r.scanPath) : false;
  console.log('['+i+']', r.label || r.id, 'enabled='+r.enabled, 'exists='+exists, r.scanPath);
});
" 2>&1