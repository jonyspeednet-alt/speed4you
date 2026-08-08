#!/bin/bash
# Comprehensive Fix Script for Speed4You Scanner Issues
# This script addresses all identified root causes and prevents future issues

echo "=== Speed4You Scanner Comprehensive Fix ==="
echo "Step 1: Fix Permission Structure"
echo "--------------------------------"

# Fix permissions for Requested directories
sudo chown -R www-data:www-data /var/www/html/Requested/
sudo chmod -R 755 /var/www/html/Requested/

# Ensure speed4you user has read access
sudo chmod -R 755 /var/www/html/Requested/
sudo usermod -a -G www-data speed4you

echo "Step 2: Update Scanner Configuration"
echo "--------------------------------------"

# Add to .env if not exists
if ! grep -q "SCANNER_MIN_MOVIE_SIZE" /home/speed4you/portal-app/backend/.env; then
  echo "SCANNER_MIN_MOVIE_SIZE=52428800" >> /home/speed4you/portal-app/backend/.env  # 50MB
fi

if ! grep -q "SCANNER_MIN_EPISODE_SIZE" /home/speed4you/portal-app/backend/.env; then
  echo "SCANNER_MIN_EPISODE_SIZE=52428800" >> /home/speed4you/portal-app/backend/.env  # 50MB
fi

echo "Step 3: Fix File Naming Issues"
echo "--------------------------------"

# Fix Musafir Cafe file naming
if [ -f "/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p..mkv" ]; then
  mv "/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p..mkv" \
     "/var/www/html/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p.mkv"
  echo "Fixed Musafir Cafe file naming"
fi

echo "Step 4: Publish Valid Draft Items"
echo "-----------------------------------"

# Publish draft items that have valid metadata (not ending with 'p' which indicates incomplete metadata)
psql -U postgres -d isp_entertainment -c "
UPDATE content_catalog 
SET status = 'published' 
WHERE source_root_id = 'south-indian-movies' 
  AND status = 'draft' 
  AND title NOT LIKE '%p'
  AND title NOT LIKE '%HQ'
  AND poster IS NOT NULL
  AND backdrop IS NOT NULL;
"

echo "Step 5: Setup Permission Monitoring"
echo "-----------------------------------"

# Create a monitoring script
cat > /home/speed4you/monitor-permissions.sh << 'EOF'
#!/bin/bash
# Check and fix permissions automatically
CHECK_DIR="/var/www/html/Requested"
if [ "$(stat -c %U:%G "$CHECK_DIR")" != "www-data:www-data" ]; then
  echo "Fixing permissions for $CHECK_DIR"
  sudo chown -R www-data:www-data "$CHECK_DIR"
  sudo chmod -R 755 "$CHECK_DIR"
fi
EOF

chmod +x /home/speed4you/monitor-permissions.sh

# Add to crontab for daily check
(crontab -l 2>/dev/null; echo "0 2 * * * /home/speed4you/monitor-permissions.sh") | crontab -

echo "Step 6: Trigger Comprehensive Rescan"
echo "-------------------------------------"

# Trigger webhook rescan
curl -X POST https://data.speed4you.net/portal-api/api/webhook/scan \
  -H "x-webhook-secret: d0c80a137b5ee31e7eff7083704c0ac073e26601429062491b3206d23ad80876" \
  -H "Content-Type: application/json"

echo "=== Fix Complete ==="
echo "Monitor the scan progress and verify results"
