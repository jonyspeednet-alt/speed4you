sudo -n systemctl restart isp-portal.service 2>&1
sleep 5
curl -s -o /dev/null -w "%%{http_code}" http://localhost:3001/api/dashboard 2>/dev/null
echo ""
