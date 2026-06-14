#!/bin/bash
# Login data
echo '{"username":"admin","***REMOVED***":"admin"}' > /tmp/login.json

# Try login
RESULT=$(curl -s -X POST http://127.0.0.1:4100/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/login.json)

echo "Login response: $RESULT"

TOKEN=$(echo "$RESULT" | grep -oP '"token"\s*:\s*"\K[^"]+')
if [ -n "$TOKEN" ]; then
  echo "LOGIN SUCCESS! Token obtained"
  echo "Running scanner..."
  SCAN_RESULT=$(curl -s -X POST http://127.0.0.1:4100/admin/scanner/run \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  echo "Scanner response: $SCAN_RESULT"
else
  echo "Login failed, trying other ***REMOVED***s..."
  for pw in ***REMOVED*** ***REMOVED*** Speed4You ***REMOVED*** ***REMOVED***6789 ***REMOVED***6; do
    echo "{\"username\":\"admin\",\"***REMOVED***\":\"$pw\"}" > /tmp/login.json
    RESULT=$(curl -s -X POST http://127.0.0.1:4100/auth/login \
      -H "Content-Type: application/json" \
      -d @/tmp/login.json)
    TOKEN=$(echo "$RESULT" | grep -oP '"token"\s*:\s*"\K[^"]+')
    if [ -n "$TOKEN" ]; then
      echo "LOGIN SUCCESS with ***REMOVED***: $pw"
      echo "Running scanner..."
      SCAN_RESULT=$(curl -s -X POST http://127.0.0.1:4100/admin/scanner/run \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
      echo "Scanner response: $SCAN_RESULT"
      exit 0
    fi
  done
  echo "All ***REMOVED***s failed"
fi
