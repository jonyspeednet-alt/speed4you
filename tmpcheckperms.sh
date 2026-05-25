ls -la /var/www/html/portal/ | head -5
echo SEP
ls -la /var/www/html/portal/assets/ | head -5
echo SEP
touch /var/www/html/portal/test.txt 2>&1
rm /var/www/html/portal/test.txt 2>&1
echo SEP
rm /var/www/html/portal/assets/WatchlistPage-d232708c.js 2>&1
echo SEP
groups
echo SEP
whoami
