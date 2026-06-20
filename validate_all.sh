#!/bin/bash
SRC="/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season 01 (2021) [Hindi]"
for ep in 01 02 03 04 05 06 07 08 09 10; do
  mp4="$SRC/Crashh 2021 Hindi S01E$ep.mp4"
  errs=$(ffmpeg -v error -i "$mp4" -f null - 2>&1 | head -20)
  if [ -z "$errs" ]; then
    echo "S01E$ep: OK"
  else
    echo "S01E$ep: ERRORS: $errs"
  fi
done
echo "=== DONE ==="
