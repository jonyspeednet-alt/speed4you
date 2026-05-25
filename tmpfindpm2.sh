find / -name pm2 -type f 2>/dev/null | head -5
echo SEP
ls /home/speed4you/portal-app/backend/node_modules/.bin/pm2 2>/dev/null
echo SEP
ls /home/speed4you/portal-app/backend/node_modules/pm2/bin/pm2 2>/dev/null
echo SEP
ps aux | grep pm2 | grep -v grep | head -5
echo SEP
head -30 /home/speed4you/portal-app/backend/package.json
