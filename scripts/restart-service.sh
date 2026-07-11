#!/bin/bash
# Restart the ISP portal service
# Requires SUDO_PASSWORD environment variable or sudoers access

if [ -z "$SUDO_PASSWORD" ]; then
  echo "ERROR: SUDO_PASSWORD environment variable is not set."
  echo "Usage: SUDO_PASSWORD=your_***REMOVED*** ./restart-service.sh"
  exit 1
fi

printf '%s\n' "$SUDO_PASSWORD" | sudo -S systemctl restart isp-portal.service
