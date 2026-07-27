#!/bin/bash
for d in /var/www/html/Requested/Series/*/; do
  name=$(basename "$d")
  count=$(find "$d" -maxdepth 1 -type f \( -name '*.mkv' -o -name '*.mp4' \) 2>/dev/null | wc -l)
  echo "$count eps - $name"
done | sort -rn
