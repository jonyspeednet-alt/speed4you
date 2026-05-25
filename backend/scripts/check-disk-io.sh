#!/bin/bash
# Disk I/O monitor — checks if any disk is saturated
# Install in cron: */5 * * * * root /usr/local/bin/check-disk-io.sh

ALERT_LOG=/var/log/disk-io-alert.log
THRESHOLD=80

iostat -x 1 2 2>/dev/null | tail -n +4 | while read -r line; do
  device=$(echo "$line" | awk '{print $1}')
  util=$(echo "$line" | awk '{print $NF}')
  
  # Skip non-sd* devices and headers
  [[ ! "$device" =~ ^sd[a-z] ]] && continue
  [[ ! "$util" =~ ^[0-9] ]] && continue
  
  util_int=${util%.*}
  
  if [ "$util_int" -gt "$THRESHOLD" ] 2>/dev/null; then
    mount_point=$(df -h | grep "/dev/$device" | awk '{print $6}')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $device ($mount_point) I/O util = $util%" >> "$ALERT_LOG"
    
    # Find top I/O-consuming processes
    echo "  Top I/O processes:" >> "$ALERT_LOG"
    iotop -b -n1 -o -P 2>/dev/null | head -5 >> "$ALERT_LOG" || \
      ps aux --sort=-%cpu | head -5 >> "$ALERT_LOG"
    echo "" >> "$ALERT_LOG"
  fi
done

# Rotate log at 10MB
if [ -f "$ALERT_LOG" ] && [ "$(stat -c%s "$ALERT_LOG" 2>/dev/null)" -gt 10485760 ]; then
  mv "$ALERT_LOG" "${ALERT_LOG}.old"
fi

exit 0
