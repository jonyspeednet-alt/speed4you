ls /var/www/speed4you.net/assets/PipelinePage-* 2>/dev/null && echo PIPELINE_EXISTS || echo PIPELINE_MISSING
ls /var/www/speed4you.net/assets/ | grep -i admin 2>/dev/null
grep -c 'pipeline' /var/www/speed4you.net/index.html 2>/dev/null
grep -c 'PipelinePage' /var/www/speed4you.net/index.html 2>/dev/null
ls /var/www/speed4you.net/assets/adminService-* 2>/dev/null
