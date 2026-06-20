#!/bin/bash
SRC="/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season 01 (2021) [Hindi]"
for ep in 01 02 03 04 05 06 07 08 09 10; do
  echo "=== Remuxing S01E$ep ==="
  ffmpeg -y -i "$SRC/Crashh 2021 Hindi S01E$ep.mkv" \
    -c:v copy -c:a aac -b:a 128k -movflags +faststart \
    "$SRC/Crashh 2021 Hindi S01E$ep.mp4" 2>&1 | tail -3
  echo ""
done
echo "=== ALL DONE ==="
