#!/bin/bash
cd /var/www/html/Requested

echo "Before:"
du -sh .

# Delete orphaned directories (not Movies or Series)
for d in */; do
  case "$d" in
    Movies/|Series/) continue;;
  esac
  echo "Deleting dir: $d"
  rm -rf "$d" 2>/dev/null
done

# Delete orphaned files at top level
for f in *.mkv *.mp4; do
  [ -f "$f" ] && echo "Deleting file: $f" && rm -f "$f" 2>/dev/null
done

# Also delete lost+found if present
[ -d "lost+found" ] && echo "Deleting lost+found" && rm -rf lost+found 2>/dev/null

echo "---AFTER---"
du -sh .
ls .
