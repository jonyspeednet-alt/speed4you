#!/bin/bash
set -e

SERIESDIR=$(find "/var/www/html/TV_Series/TV_Web_Series-F-M/" -maxdepth 1 -iname "*Maamla*" -type d | head -1)
echo "Series dir: $SERIESDIR"

# Create Season subdirectories
mkdir -p "$SERIESDIR/Season 1"
mkdir -p "$SERIESDIR/Season 2"

# Move S01 files to Season 1
for f in "$SERIESDIR"/*S01E*.mkv; do
  [ -f "$f" ] && mv "$f" "$SERIESDIR/Season 1/" && echo "Moved S01: $(basename "$f")"
done

# Move S02 files to Season 2
for f in "$SERIESDIR"/*S02E*.mkv; do
  [ -f "$f" ] && mv "$f" "$SERIESDIR/Season 2/" && echo "Moved S02: $(basename "$f")"
done

# Verify
echo "--- Season 1 ---"
ls "$SERIESDIR/Season 1/" | head -10
echo "--- Season 2 ---"
ls "$SERIESDIR/Season 2/" | head -10
echo "--- Remaining flat files (should be empty) ---"
ls "$SERIESDIR"/*.mkv 2>/dev/null || echo "(none)"
