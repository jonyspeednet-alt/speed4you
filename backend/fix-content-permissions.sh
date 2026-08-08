#!/bin/bash

# Permission Fix Script for Speed4You Content
# This script fixes ownership and permissions for content directories
# to ensure the scanner can access all media files

TARGET_USER="www-data"
TARGET_GROUP="www-data"
CONTENT_ROOT="/var/www/html"

echo "=== Speed4You Content Permission Fix ==="
echo "Target user: $TARGET_USER"
echo "Target group: $TARGET_GROUP"
echo "Content root: $CONTENT_ROOT"
echo ""

# Function to fix permissions for a directory
fix_directory_permissions() {
    local dir_path="$1"
    echo "Fixing permissions for: $dir_path"
    
    # Fix ownership
    sudo chown -R $TARGET_USER:$TARGET_GROUP "$dir_path" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ Ownership fixed"
    else
        echo "  ✗ Failed to fix ownership (may need sudo)"
        return 1
    fi
    
    # Fix directory permissions
    sudo find "$dir_path" -type d -exec chmod 755 {} + 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ Directory permissions fixed"
    else
        echo "  ✗ Failed to fix directory permissions"
    fi
    
    # Fix file permissions
    sudo find "$dir_path" -type f -exec chmod 644 {} + 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ File permissions fixed"
    else
        echo "  ✗ Failed to fix file permissions"
    fi
}

# Fix specific content directories
echo "=== Fixing Content Directories ==="

# Requested content
fix_directory_permissions "$CONTENT_ROOT/Requested/Series"
fix_directory_permissions "$CONTENT_ROOT/Requested/Movies"

# Main content directories
fix_directory_permissions "$CONTENT_ROOT/English_Movies"
fix_directory_permissions "$CONTENT_ROOT/Hindi_Movies"
fix_directory_permissions "$CONTENT_ROOT/Hindi_Dubbed_Movies"
fix_directory_permissions "$CONTENT_ROOT/South_Indian_Movies"
fix_directory_permissions "$CONTENT_ROOT/TV_Series"
fix_directory_permissions "$CONTENT_ROOT/New_Movies_1"
fix_directory_permissions "$CONTENT_ROOT/New_Movies_2"

echo ""
echo "=== Permission Fix Complete ==="
echo "Note: If you see 'Failed to fix ownership' errors, run this script with sudo privileges"
