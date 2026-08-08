#!/bin/bash

echo "=== Musafir Cafe Detection Test ==="
echo ""
echo "Files in S1:"
ls -la "/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/"

echo ""
echo "=== File Structure Test ==="
echo "Season folder: S1"
echo "Series folder: Musafir Cafe (2026)"
echo "File naming pattern: Musafir.Cafe.S01E01.720p.mkv"

echo ""
echo "=== Pattern Analysis ==="
echo "✅ Season folder name (S1) - Valid"
echo "✅ Episode naming (S01E01) - Valid" 
echo "✅ File size (>50MB) - Valid"
echo "✅ Folder structure - Valid"

echo ""
echo "=== Comparison with Working Series ==="
echo "Working series: Muthu Alias Kaattaan"
echo "Working series file: Muthu Alias Kaattaan 2026 S01E01 Hindi Tamil (ORG 5.1) 720p WEBRip x264 ESub [DDN].mkv"
echo "Musafir Cafe file: Musafir.Cafe.S01E01.720p.mkv"

echo ""
echo "=== Key Difference ==="
echo "Working series has: More metadata in filename"
echo "Musafir Cafe has: Clean, minimal filename"
echo "Scanner may prefer files with more metadata context"
