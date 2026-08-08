#!/bin/bash
CHECK_DIR="/var/www/html/Requested"
LOG_FILE="/var/log/permission-monitor.log"

if [ "$(stat -c %U:%G "$CHECK_DIR")" != "www-data:www-data" ]; then
  echo "$(date): Fixing permissions for $CHECK_DIR" >> "$LOG_FILE"
  sudo chown -R www-data:www-data "$CHECK_DIR"
  sudo chmod -R 755 "$CHECK_DIR"
  echo "$(date): Permissions fixed" >> "$LOG_FILE"
fi
