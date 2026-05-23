Write-Host "=== Kill old normalizer ==="
$plink = '& "C:\Program Files\PuTTY\plink.exe" -ssh speed4you@***REMOVED*** -P 2973 -pw "***REMOVED***" -hostkey "ssh-ed25519 255 SHA256:RVa4r61dsjHbh52j0eIllF0yCj6rJebnPKnj7x3JXco" -batch '
Invoke-Expression ($plink + '"kill 888473 2>/dev/null; sleep 1"')
Start-Sleep -Seconds 2

Write-Host "=== Check all directories and fix permissions ==="
$script = @'
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
echo "=== Restart normalizer ==="
export NODE_PATH=/home/speed4you/portal-app/backend/node_modules
cd /home/speed4you/portal-app/backend
nohup node scripts/normalize-media-library.js </dev/null >/tmp/normalizer.log 2>&1 &
echo "PID: $!"
sleep 3
tail -5 /tmp/normalizer.log
'@
Invoke-Expression ($plink + '"' + $script.Replace('"', '\"') + '"')
