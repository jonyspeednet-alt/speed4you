#!/bin/bash
set -e
JWT_SECRET_VAL=$(grep JWT_SECRET /home/speed4you/portal-app/backend/.env | cut -d= -f2)
TOKEN=$(cd /home/speed4you/portal-app/backend && JWT_SIGN_SECRET="$JWT_SECRET_VAL" node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({id:1, username:'admin', role:'admin'}, process.env['JWT_SIGN_SECRET'], {expiresIn:'1h'}));")
echo "Token generated: ${TOKEN:0:15}..."

echo "Clearing backend scanner metadata cache..."
curl -s -X POST http://127.0.0.1:4100/api/admin/scanner/cache/clear \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

echo "Running fix-missing-posters..."
curl -s -X POST http://127.0.0.1:4100/api/admin/metadata/fix-missing-posters \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10}'
echo ""
