SRC=/home/speed4you/projects/_work/speed4you/speed4you/frontend/dist
DST=/var/www/html/portal
rsync -av --chown www-data:www-data "$SRC/" "$DST/" 2>&1 | tail -10
echo DONE
