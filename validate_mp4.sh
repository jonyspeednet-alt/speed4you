#!/bin/bash
set -e
MP4=$(find "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crashh/" -name "*S01E01*.mp4" -type f | head -1)

echo "=== Validate MP4 with ffmpeg ==="
ffmpeg -v error -i "$MP4" -f null - 2>&1 | head -50 || echo "ffmpeg returned: $?"

echo ""
echo "=== Check file integrity ==="
ffprobe -v error -show_entries format=nb_streams,size,duration,format_name -of default=noprint_wrappers=1 "$MP4" 2>&1

echo ""
echo "=== Check first 5 seconds decode ==="
ffmpeg -v error -t 5 -i "$MP4" -f null - 2>&1 | head -20 || echo "ffmpeg decode test returned: $?"

echo ""
echo "=== Check ALL episodes ==="
for EP in "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crashh/"*.mp4; do
  name=$(basename "$EP")
  err=$(ffprobe -v error -show_entries format=format_name,size,duration -of default=noprint_wrappers=1 "$EP" 2>&1)
  status=$?
  if [ $status -ne 0 ]; then
    echo "FAIL: $name ($err)"
  else
    echo "OK: $name ($err)"
  fi
done
