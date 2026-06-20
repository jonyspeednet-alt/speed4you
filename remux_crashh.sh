#!/bin/bash
cd "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season 01 (2021) [Hindi]"
for f in *.mkv; do
  echo "Remuxing: $f"
  ffmpeg -i "$f" -c copy -movflags +faststart "${f%.mkv}.mp4" 2>&1 | tail -1
done
echo "DONE"
