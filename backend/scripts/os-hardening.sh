#!/bin/bash
set -e
PASS="$1"

echo "$PASS" | sudo -S bash -c '
echo "=== 1. OOM Protection for critical services ==="
systemctl set-property nginx.service OOMScoreAdjust=-500
systemctl set-property postgresql@16-main.service OOMScoreAdjust=-500
echo "nginx + postgres protected"

echo "=== 2. Backend lowest OOM priority ==="
systemctl set-property isp-portal.service OOMScoreAdjust=1000
echo "isp-portal OOMScoreAdjust=1000"

echo "=== 3. Backend auto-restart on crash ==="
mkdir -p /etc/systemd/system/isp-portal.service.d/
cat > /etc/systemd/system/isp-portal.service.d/override.conf << OEOF
[Service]
Restart=always
RestartSec=5
OEOF
systemctl daemon-reload
echo "Auto-restart configured"

echo "=== 4. Cron: read-only auto recovery ==="
cat > /etc/cron.d/readonly-check << COEOF
* * * * * root touch /tmp/.heartbeat 2>/dev/null || (mount -o remount,rw / && systemctl restart isp-portal.service)
COEOF
echo "Cron installed"

echo "=== 5. Verify ==="
systemctl show isp-portal.service | grep -E "OOMScoreAdjust|Restart"
echo ""
echo "=== OS Hardening Complete ==="
'
