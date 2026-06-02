Write-Host "=== Kill old normalizer ==="
$plink = '& "C:\Program Files\PuTTY\plink.exe" -ssh speed4you@***REMOVED*** -P 2973 -pw "***REMOVED***" -hostkey "ssh-ed25519 255 SHA256:RVa4r61dsjHbh52j0eIllF0yCj6rJebnPKnj7x3JXco" -batch '
Invoke-Expression ($plink + '"kill 888473 2>/dev/null; sleep 1"')
Start-Sleep -Seconds 2

Write-Host "=== Check all scanner directories and fix permissions ==="
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
  else
    echo "MISSING: $1"
  fi
}
echo "--- Main media directories ---"
fix_dir '/var/www/html/English_Movies'
fix_dir '/var/www/html/Hindi_Movies'
fix_dir '/var/www/html/Hindi_Dubbed_Movies'
fix_dir '/var/www/html/New_Movies_1'
fix_dir '/var/www/html/New_Movies_2'
fix_dir '/var/www/html/South_Indian_Movies'
fix_dir '/var/www/html/3D_Movies'
fix_dir '/var/www/html/Other_Foreign_Movies'
fix_dir '/var/www/html/Bangla_Movies'
echo "--- TV Series ---"
fix_dir '/var/www/html/TV_Series'
fix_dir '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E'
fix_dir '/var/www/html/TV_Series/TV_Web_Series-F-M'
fix_dir '/var/www/html/TV_Series/TV_Web_Series-N-S'
fix_dir '/var/www/html/TV_Series/TV_Web_Series-U-Z'
echo "=== Restart normalizer ==="
export NODE_PATH=/home/speed4you/portal-app/backend/node_modules
cd /home/speed4you/portal-app/backend
nohup node scripts/normalize-media-library.js </dev/null >/tmp/normalizer.log 2>&1 &
echo "PID: $!"
sleep 3
tail -5 /tmp/normalizer.log
'@
Invoke-Expression ($plink + '"' + $script.Replace('"', '\"') + '"')
