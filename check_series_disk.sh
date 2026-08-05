#!/bin/bash
echo "=== The Terror - Season 01 ==="
ls -la "/var/www/html/TV_Series/TV_Web_Series-T/The Terror/Season 01/" 2>&1 | head -20

echo ""
echo "=== The Test Case ==="
ls -la "/var/www/html/TV_Series/TV_Web_Series-T/" 2>&1 | grep -i "test"
ls -la "/var/www/html/TV_Series/TV_Web_Series-T/The Test Case/" 2>&1 | head -10

echo ""
echo "=== The Three Stooges ==="
ls -la "/var/www/html/TV_Series/TV_Web_Series-T/The Three Stooges/" 2>&1 | head -10

echo ""
echo "=== The Thundermans ==="
ls -la "/var/www/html/TV_Series/TV_Web_Series-T/The Thundermans/" 2>&1 | head -10

echo ""
echo "=== The Tomorrow People ==="
ls -la "/var/www/html/TV_Series/TV_Web_Series-T/The Tomorrow People/" 2>&1 | head -10

echo ""
echo "=== Regai ==="
find /var/www/html -maxdepth 4 -iname "*regai*" -o -iname "*regei*" 2>/dev/null | head -10
