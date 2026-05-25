# Check if PM2 is handling it
pm2 list 2>/dev/null || echo no pm2
# Check if there's a restart mechanism
cat /etc/systemd/system/isp-portal.service 2>/dev/null | head -20
echo "---"
# kill and let systemd restart
kill -HUP 85261 2>/dev/null && echo "sent HUP" || echo "no HUP"
# Just kill the process - systemd should auto-restart
kill 85261 2>/dev/null; sleep 2; pgrep -f "node.*index" | head -3