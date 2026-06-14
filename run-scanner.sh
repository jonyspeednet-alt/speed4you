#!/bin/bash
set -e

for pw in admin ***REMOVED*** ***REMOVED*** Speed4You ***REMOVED*** ***REMOVED***6789 Speed4you speed4you; do
  echo "Trying ***REMOVED***: $pw"
  RESULT=$(curl -s -X POST http://127.0.0.1:4100/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"***REMOVED***\":\"$pw\"}")
  
  TOKEN=$(echo "$RESULT" | grep -oP '"token"\s*:\s*"\K[^"]+')
  if [ -n "$TOKEN" ]; then
    echo "LOGIN SUCCESSFUL! Password: $pw"
    
    # Run scanner
    echo "Running scanner..."
    SCAN_RESULT=$(curl -s -X POST http://127.0.0.1:4100/api/admin/scanner/run \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    echo "Scanner response: $SCAN_RESULT"
    exit 0
  fi
done

echo "None of the ***REMOVED***s worked"
