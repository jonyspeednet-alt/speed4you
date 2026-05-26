#!/bin/bash
TARGETDIR=$(find "/var/www/html/TV_Series/TV_Web_Series-F-M/" -maxdepth 1 -iname "*Maamla*" -type d | head -1)
echo "Target: $TARGETDIR"
for f in /var/www/html/Hindi_Movies/Maamla.Legal.Hai.S02E*.mkv; do
  echo "Moving: $(basename "$f")"
  mv "$f" "$TARGETDIR/"
done
echo "Done moving files"
ls -la "$TARGETDIR/" | grep S02
