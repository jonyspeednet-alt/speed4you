curl -s -o /dev/null -w '%{http_code}' http://localhost:4100/api/admin/pipeline/status
echo SP1
curl -s -o /dev/null -w '%{http_code}' http://localhost:4100/api/admin/pipeline/scanner-queue?limit=5
echo SP2
curl -s -o /dev/null -w '%{http_code}' http://localhost:4100/api/admin/pipeline/normalizer-queue?limit=5
echo SP3
curl -s -o /dev/null -w '%{http_code}' http://localhost:4100/api/admin/pipeline/log?limit=5
echo SP4
cat /var/www/html/portal/assets/PipelinePage-1ec57e48.js | head -c 50
echo SP5
echo ALL_VERIFIED
