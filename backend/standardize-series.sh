#!/bin/bash

SERIES_PATH="/var/www/html/Requested/Series"

echo "=== Series Folder Standardization ==="
echo "Total folders:"
ls "$SERIES_PATH" | wc -l

echo ""
echo "Standardization plan:"
echo "Batman.Caped.Crusader 2026 → Batman Caped Crusader 2026"
echo "The art of sarah (2026) → The Art of Sarah (2026)"
echo "Taskaree The.Smugglers Web (2026) → Taskaree The Smugglers Web (2026)"

echo ""
echo "=== Applying Standardization ==="

# Rename Batman.Caped.Crusader 2026
if [ -d "$SERIES_PATH/Batman.Caped.Crusader 2026" ]; then
    if [ ! -d "$SERIES_PATH/Batman Caped Crusader 2026" ]; then
        mv "$SERIES_PATH/Batman.Caped.Crusader 2026" "$SERIES_PATH/Batman Caped Crusader 2026"
        echo "RENAMED: Batman.Caped.Crusader 2026 → Batman Caped Crusader 2026"
    else
        echo "SKIP: Batman Caped Crusader 2026 already exists"
    fi
fi

# Rename The art of sarah (2026)
if [ -d "$SERIES_PATH/The art of sarah (2026)" ]; then
    if [ ! -d "$SERIES_PATH/The Art of Sarah (2026)" ]; then
        mv "$SERIES_PATH/The art of sarah (2026)" "$SERIES_PATH/The Art of Sarah (2026)"
        echo "RENAMED: The art of sarah (2026) → The Art of Sarah (2026)"
    else
        echo "SKIP: The Art of Sarah (2026) already exists"
    fi
fi

# Rename Taskaree The.Smugglers Web (2026)
if [ -d "$SERIES_PATH/Taskaree The.Smugglers Web (2026)" ]; then
    if [ ! -d "$SERIES_PATH/Taskaree The Smugglers Web (2026)" ]; then
        mv "$SERIES_PATH/Taskaree The.Smugglers Web (2026)" "$SERIES_PATH/Taskaree The Smugglers Web (2026)"
        echo "RENAMED: Taskaree The.Smugglers Web (2026) → Taskaree The Smugglers Web (2026)"
    else
        echo "SKIP: Taskaree The Smugglers Web (2026) already exists"
    fi
fi

echo ""
echo "=== Standardization Complete ==="
echo "Updated folders:"
ls "$SERIES_PATH"
