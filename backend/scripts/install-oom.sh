#!/bin/bash
set -e

SERVICES="ssh.service postgresql@16-main.service nginx.service"

for svc in $SERVICES; do
  dir="/etc/systemd/system/${svc}.d"
  file="${dir}/override.conf"
  sudo mkdir -p "$dir"
  sudo cp /tmp/oom-override.conf "$file"
  echo "Created $file"
done

sudo systemctl daemon-reload
echo "Daemon reloaded"

for svc in $SERVICES; do
  val=$(sudo systemctl show "$svc" -p OOMScoreAdjust --value)
  echo "$svc OOMScoreAdjust=$val"
done

echo "=== DONE ==="
