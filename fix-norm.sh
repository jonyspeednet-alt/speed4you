#!/bin/bash
sudo_fix() {
  echo '***REMOVED***' | sudo -S chmod g+w "$1" 2>/dev/null
}
fix_dir() {
  if [ -d "$1" ]; then
    perms=$(ls -ld "$1" | awk '{print $1}')
    echo "$1: $perms"
    case "$perms" in
      drwxrwsr-x*) echo "  OK" ;;
      *) echo "  FIXING..." && sudo_fix "$1" && ls -ld "$1" | awk '{print "  -> "$1}' ;;
    esac
  fi
}
fix_dir '/var/www/html/English Movies'
fix_dir '/var/www/html/English Series'
fix_dir '/var/www/html/Bangla Movies'
fix_dir '/var/www/html/Bangla Series'
fix_dir '/var/www/html/Hindi Movies'
fix_dir '/var/www/html/Hindi Series'
fix_dir '/var/www/html/Anime'
fix_dir '/var/www/html/Kids'
fix_dir '/var/www/html/Documentaries'

# Check other possible media dirs
for d in /var/www/html/*/; do
  basename "$d" | grep -qiE 'movie|series|anime|kids|docu|bangla|hindi|english' && fix_dir "$d"
done

echo "=== Kill old normalizer ==="
kill $(pgrep -f 'normalize-media-library' | grep -v grep) 2>/dev/null
sleep 2

echo "=== Restart normalizer ==="
export NODE_PATH=/home/speed4you/portal-app/backend/node_modules
cd /home/speed4you/portal-app/backend
nohup node scripts/normalize-media-library.js </dev/null >/tmp/normalizer.log 2>&1 &
echo "PID: $!"
sleep 3
tail -5 /tmp/normalizer.log
