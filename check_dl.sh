#!/bin/bash
echo "=== Download Status ==="
ls -la '/var/www/html/TV_Series/TV_Web_Series-F-M/How I Met Your Mother (2005)/' 2>/dev/null
echo ""
echo "=== Files per season ==="
for i in 1 2 3 4 5 6 7 8 9; do
  count=$(ls "/var/www/html/TV_Series/TV_Web_Series-F-M/How I Met Your Mother (2005)/Season $i/"*.mp4 2>/dev/null | wc -l)
  echo "Season $i: $count files"
done
echo ""
echo "=== Tmux still running? ==="
tmux ls 2>/dev/null
echo ""
echo "=== Download log last 5 lines ==="
tail -5 /tmp/himym_download.log 2>/dev/null
