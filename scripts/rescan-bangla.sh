#!/bin/bash
# Trigger a re-scan of Bangla Movies via the portal backend API
# Requires ADMIN_USERNAME and ADMIN_PASSWORD environment variables

BACKEND_URL="http://127.0.0.1:4100"
ROOT_ID="extra-storage-bangla-movies"

if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set."
  echo "Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=your***REMOVED*** ./rescan-bangla.sh"
  exit 1
fi

echo "=== STEP 1: Check backend health ==="
curl -s "$BACKEND_URL/health" | head -100

echo ""
echo "=== STEP 2: Get admin token ==="
TOKEN=$(curl -s -X POST "$BACKEND_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"***REMOVED***\":\"$ADMIN_PASSWORD\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Check your ADMIN_USERNAME and ADMIN_PASSWORD."
  exit 1
fi

echo "Token obtained: ${TOKEN:0:30}..."

echo ""
echo "=== STEP 3: Trigger scan for Bangla Movies root ==="
SCAN_RESULT=$(curl -s -X POST "$BACKEND_URL/api/admin/scanner/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"rootIds\":[\"$ROOT_ID\"]}")
echo "Scan result: $SCAN_RESULT"

echo ""
echo "=== STEP 4: Check scanner status after 10s ==="
sleep 10
curl -s "$BACKEND_URL/api/admin/scanner/status" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))" 2>/dev/null | head -50
