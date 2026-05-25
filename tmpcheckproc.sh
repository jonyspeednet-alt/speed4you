ps aux | grep "index.js" | grep -v grep | head -5
echo SEP
systemctl list-units --type=service --state=running 2>/dev/null | grep portal
echo SEP
cat /home/speed4you/portal-app/backend/.github/workflows/deploy.yml 2>/dev/null | grep -E "pm2|start|restart" | head -10
echo SEP
ls /home/speed4you/portal-app/backend/ecosystem* 2>/dev/null
echo SEP
ls /etc/systemd/system/portal* 2>/dev/null
echo SEP
crontab -l 2>/dev/null | head -10
