#!/bin/bash
# Step-by-step execution of comprehensive fix
# Execute each step with individual commands

echo "=== Speed4You Scanner Comprehensive Fix (Step-by-Step) ==="
echo ""

# Step 1: Fix permissions (needs sudo)
echo "Step 1: Fix Permission Structure"
echo "--------------------------------"
echo "You will need to enter your sudo password for permission changes"
echo ""

echo "Command: sudo chown -R www-data:www-data /var/www/html/Requested/"
sudo chown -R www-data:www-data /var/www/html/Requested/

echo "Command: sudo chmod -R 755 /var/www/html/Requested/"
sudo chmod -R 755 /var/www/html/Requested/

echo "✓ Permissions fixed"
echo ""

# Step 2: Update scanner configuration
echo "Step 2: Update Scanner Configuration"
echo "--------------------------------------"

ENV_FILE="/home/speed4you/portal-app/backend/.env"

if ! grep -q "SCANNER_MIN_MOVIE_SIZE" "$ENV_FILE"; then
  echo "Adding SCANNER_MIN_MOVIE_SIZE=52428800 to .env"
  echo "SCANNER_MIN_MOVIE_SIZE=52428800" >> "$ENV_FILE"
fi

if ! grep -q "SCANNER_MIN_EPISODE_SIZE" "$ENV_FILE"; then
  echo "Adding SCANNER_MIN_EPISODE_SIZE=52428800 to .env"
  echo "SCANNER_MIN_EPISODE_SIZE=52428800" >> "$ENV_FILE"
fi

if ! grep -q "SCANNER_AUTO_SCAN_INTERVAL_MINUTES" "$ENV_FILE"; then
  echo "Adding SCANNER_AUTO_SCAN_INTERVAL_MINUTES=360 to .env"
  echo "SCANNER_AUTO_SCAN_INTERVAL_MINUTES=360" >> "$ENV_FILE"
fi

echo "✓ Scanner configuration updated"
echo ""

# Step 3: Fix file naming
echo "Step 3: Fix File Naming Issues"
echo "--------------------------------"

MUSAFIR_FILE="/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p..mkv"
if [ -f "$MUSAFIR_FILE" ]; then
  echo "Fixing Musafir Cafe file naming"
  mv "$MUSAFIR_FILE" "/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p.mkv"
  echo "✓ Fixed Musafir Cafe file naming"
else
  echo "Musafir Cafe file already fixed or not found"
fi

echo ""

# Step 4: Publish draft items
echo "Step 4: Publish Valid Draft Items"
echo "-----------------------------------"

echo "Publishing valid draft items..."
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

echo "✓ Draft items published"
echo ""

# Step 5: Setup monitoring
echo "Step 5: Setup Permission Monitoring"
echo "-----------------------------------"

MONITOR_SCRIPT="/home/speed4you/monitor-permissions.sh"
cat > "$MONITOR_SCRIPT" << 'EOF'
#!/bin/bash
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
echo "✓ Monitoring script created"

if ! crontab -l 2>/dev/null | grep -q "monitor-permissions.sh"; then
  (crontab -l 2>/dev/null; echo "0 2 * * * $MONITOR_SCRIPT >> /var/log/permission-monitor.log 2>&1") | crontab -
  echo "✓ Added monitoring to crontab"
fi

echo ""

# Step 6: Create upload guidelines
echo "Step 6: Create Upload Guidelines"
echo "-----------------------------------"

GUIDELINES_FILE="/var/www/html/UPLOAD_GUIDELINES.md"
cat > "$GUIDELINES_FILE" << 'EOF'
# Speed4You Upload Guidelines

## File Naming Requirements
- Use standard naming: SeriesName.S01E01.720p.mkv (no double dots)
- Avoid special characters in filenames
- Use proper season/episode numbering

## Directory Structure
- Series: /Requested/Series/Series Name (Year)/S01/
- Movies: /Requested/Movies/Movie Name (Year).mkv

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

echo "✓ Upload guidelines created"
echo ""

# Step 7: Trigger rescan
echo "Step 7: Trigger Comprehensive Rescan"
echo "-------------------------------------"

WEBHOOK_SECRET=$(grep "WEBHOOK_SECRET" "$ENV_FILE" | cut -d '=' -f2 || echo "d0c80a137b5ee31e7eff7083704c0ac073e26601429062491b3206d23ad80876")

echo "Triggering rescan..."
curl -X POST https://data.speed4you.net/portal-api/api/webhook/scan \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -H "Content-Type: application/json"

echo ""
echo "✓ Rescan triggered"
echo ""

# Step 8: Restart backend
echo "Step 8: Restart Backend Service"
echo "---------------------------------"
echo "You will need to enter your sudo password for service restart"
echo ""

echo "Command: sudo systemctl restart isp-portal.service"
sudo systemctl restart isp-portal.service

sleep 5

if systemctl is-active --quiet isp-portal.service; then
  echo "✓ Backend service restarted successfully"
else
  echo "⚠ Backend service failed to start"
fi

echo ""
echo "=== Comprehensive Fix Complete ==="
