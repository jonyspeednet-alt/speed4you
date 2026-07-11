#!/bin/bash
# Run the scanner via the portal API
# Requires ADMIN_USERNAME and ADMIN_PASSWORD environment variables

if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set."
  echo "Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=your***REMOVED*** ./run-scanner.sh"
  exit 1
fi

echo "Logging in as $ADMIN_USERNAME..."
RESULT=$(curl -s -X POST http://127.0.0.1:4100/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"***REMOVED***\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$RESULT" | grep -oP '"token"\s*:\s*"\K[^"]+')
if [ -n "$TOKEN" ]; then
  echo "Login successful!"
  echo "Running scanner..."
  SCAN_RESULT=$(curl -s -X POST http://127.0.0.1:4100/api/admin/scanner/run \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  echo "Scanner response: $SCAN_RESULT"
else
  echo "Login failed. Check your ADMIN_USERNAME and ADMIN_PASSWORD."
  exit 1
fi
