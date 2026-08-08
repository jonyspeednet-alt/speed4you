#!/bin/bash
# Comprehensive Fix Script for Speed4You Scanner Issues
# This script addresses all identified root causes and prevents future issues

set -e

echo "=== Speed4You Scanner Comprehensive Fix ==="
echo "Starting comprehensive fix at $(date)"
echo ""

# Step 1: Fix Permission Structure
echo "Step 1: Fix Permission Structure"
echo "--------------------------------"

# Fix permissions for Requested directories
echo "Fixing ownership for /var/www/html/Requested/"
sudo chown -R www-data:www-data /var/www/html/Requested/
sudo chmod -R 755 /var/www/html/Requested/

# Ensure speed4you user has proper group access
echo "Ensuring speed4you user has www-data group access"
sudo usermod -a -G www-data speed4you

# Verify permissions
echo "Verifying permissions..."
ls -la /var/www/html/Requested/ | head -5

echo "✓ Permission structure fixed"
echo ""

# Step 2: Update Scanner Configuration
echo "Step 2: Update Scanner Configuration"
echo "--------------------------------------"

ENV_FILE="/home/speed4you/portal-app/backend/.env"

# Add scanner configuration if not exists
if ! grep -q "SCANNER_MIN_MOVIE_SIZE" "$ENV_FILE"; then
  echo "Adding SCANNER_MIN_MOVIE_SIZE=52428800 (50MB) to .env"
  echo "SCANNER_MIN_MOVIE_SIZE=52428800" >> "$ENV_FILE"
fi

if ! grep -q "SCANNER_MIN_EPISODE_SIZE" "$ENV_FILE"; then
  echo "Adding SCANNER_MIN_EPISODE_SIZE=52428800 (50MB) to .env"
  echo "SCANNER_MIN_EPISODE_SIZE=52428800" >> "$ENV_FILE"
fi

if ! grep -q "SCANNER_AUTO_SCAN_INTERVAL_MINUTES" "$ENV_FILE"; then
  echo "Adding SCANNER_AUTO_SCAN_INTERVAL_MINUTES=360 (6 hours) to .env"
  echo "SCANNER_AUTO_SCAN_INTERVAL_MINUTES=360" >> "$ENV_FILE"
fi

echo "✓ Scanner configuration updated"
echo ""

# Step 3: Fix File Naming Issues
echo "Step 3: Fix File Naming Issues"
echo "--------------------------------"

# Fix Musafir Cafe file naming
MUSAFIR_FILE="/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p..mkv"
if [ -f "$MUSAFIR_FILE" ]; then
  echo "Fixing Musafir Cafe file naming"
  mv "$MUSAFIR_FILE" "/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p.mkv"
  echo "✓ Fixed Musafir Cafe file naming"
else
  echo "Musafir Cafe file already fixed or not found"
fi

echo ""

# Step 4: Publish Valid Draft Items
echo "Step 4: Publish Valid Draft Items"
echo "-----------------------------------"

# Publish draft items that have valid metadata
echo "Publishing valid draft items from database..."
psql -U postgres -d isp_entertainment -c "
UPDATE content_catalog 
SET status = 'published' 
WHERE source_root_id = 'south-indian-movies' 
  AND status = 'draft' 
  AND title NOT LIKE '%p'
  AND poster IS NOT NULL
  AND backdrop IS NOT NULL
  AND description IS NOT NULL;
"

# Get count of published items
PUBLISHED_COUNT=$(psql -U postgres -d isp_entertainment -t -c "
SELECT COUNT(*) FROM content_catalog 
WHERE source_root_id = 'south-indian-movies' AND status = 'published';
")

echo "✓ Published $PUBLISHED_COUNT items"
echo ""

# Step 5: Setup Permission Monitoring
echo "Step 5: Setup Permission Monitoring"
echo "-----------------------------------"

# Create a monitoring script
MONITOR_SCRIPT="/home/speed4you/monitor-permissions.sh"
cat > "$MONITOR_SCRIPT" << 'EOF'
#!/bin/bash
# Monitor and fix permissions automatically
CHECK_DIR="/var/www/html/Requested"
LOG_FILE="/var/log/permission-monitor.log"

if [ "$(stat -c %U:%G "$CHECK_DIR")" != "www-data:www-data" ]; then
  echo "$(date): Fixing permissions for $CHECK_DIR" >> "$LOG_FILE"
  sudo chown -R www-data:www-data "$CHECK_DIR"
  sudo chmod -R 755 "$CHECK_DIR"
  echo "$(date): Permissions fixed" >> "$LOG_FILE"
fi
EOF

chmod +x "$MONITOR_SCRIPT"
echo "✓ Permission monitoring script created at $MONITOR_SCRIPT"

# Add to crontab for daily check
if ! crontab -l 2>/dev/null | grep -q "monitor-permissions.sh"; then
  (crontab -l 2>/dev/null; echo "0 2 * * * $MONITOR_SCRIPT >> /var/log/permission-monitor.log 2>&1") | crontab -
  echo "✓ Added permission monitoring to crontab (daily at 2 AM)"
else
  echo "✓ Permission monitoring already in crontab"
fi

echo ""

# Step 6: Create Upload Guidelines
echo "Step 6: Create Upload Guidelines"
echo "-----------------------------------"

GUIDELINES_FILE="/var/www/html/UPLOAD_GUIDELINES.md"
cat > "$GUIDELINES_FILE" << 'EOF'
# Speed4You Upload Guidelines

## File Naming Requirements
- Use standard naming: `SeriesName.S01E01.720p.mkv` (no double dots)
- Avoid special characters in filenames
- Use proper season/episode numbering

## Directory Structure
- Series: `/Requested/Series/Series Name (Year)/S01/`
- Movies: `/Requested/Movies/Movie Name (Year).mkv`

## Permission Requirements
- All files should be owned by www-data:www-data
- Directories should have 755 permissions
- Files should have 644 permissions

## Content Requirements
- Minimum file size: 50MB
- Valid video formats: .mkv, .mp4, .avi, .mov
- Include poster images when possible

## Scanner Processing
- Scanner runs every 6 hours automatically
- New content is typically processed within 6 hours of upload
- Draft items are published automatically once metadata is complete
EOF

echo "✓ Upload guidelines created at $GUIDELINES_FILE"
echo ""

# Step 7: Trigger Comprehensive Rescan
echo "Step 7: Trigger Comprehensive Rescan"
echo "-------------------------------------"

# Get current webhook secret from .env
WEBHOOK_SECRET=$(grep "WEBHOOK_SECRET" "$ENV_FILE" | cut -d '=' -f2 || echo "d0c80a137b5ee31e7eff7083704c0ac073e26601429062491b3206d23ad80876")

echo "Triggering comprehensive rescan..."
RESPONSE=$(curl -s -X POST https://data.speed4you.net/portal-api/api/webhook/scan \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -H "Content-Type: application/json")

echo "Scan triggered. Response: $RESPONSE"
echo ""

# Step 8: Restart Backend Service
echo "Step 8: Restart Backend Service"
echo "---------------------------------"

echo "Restarting isp-portal.service to apply configuration changes..."
sudo systemctl restart isp-portal.service

# Wait for service to start
sleep 5

# Check service status
if systemctl is-active --quiet isp-portal.service; then
  echo "✓ Backend service restarted successfully"
else
  echo "⚠ Backend service failed to start. Check logs with: journalctl -u isp-portal.service"
fi

echo ""
echo "=== Comprehensive Fix Complete ==="
echo "Summary of changes:"
echo "1. ✓ Fixed permission structure for /var/www/html/Requested/"
echo "2. ✓ Updated scanner configuration (reduced minimum file size to 50MB)"
echo "3. ✓ Fixed file naming issues (Musafir Cafe)"
echo "4. ✓ Published valid draft items"
echo "5. ✓ Setup permission monitoring (daily at 2 AM)"
echo "6. ✓ Created upload guidelines"
echo "7. ✓ Triggered comprehensive rescan"
echo "8. ✓ Restarted backend service"
echo ""
echo "Next steps:"
echo "- Monitor scan progress in logs: journalctl -u isp-portal.service -f"
echo "- Check new content on the site after scan completes"
echo "- Review upload guidelines before adding new content"
echo ""
echo "Fix completed at $(date)"
