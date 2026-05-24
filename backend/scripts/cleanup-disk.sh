#!/bin/bash
set -e

THRESHOLD_GB=85
MIN_FREE_GB=10

ROOT_PCT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
ROOT_AVAIL_KB=$(df / | awk 'NR==2 {print $4}')

echo "[$(date)] Root usage: ${ROOT_PCT}%, avail: $(( ROOT_AVAIL_KB / 1024 / 1024 )) GB"

if [ "$ROOT_PCT" -lt "$THRESHOLD_GB" ]; then
  echo "[$(date)] Below threshold, skipping"
  exit 0
fi

echo "[$(date)] Cleaning..."

apt clean -qq 2>/dev/null || true

journalctl --vacuum-time=7d --quiet 2>/dev/null || true

find /var/www/html -maxdepth 4 -name '.Trash*' -type d -exec rm -rf {} + 2>/dev/null || true

find /var/www/html -name '*.normalizing.*' -type f -mtime +1 -delete 2>/dev/null || true
find /var/www/html -name '*.pre-normalize.*' -type f -mtime +1 -delete 2>/dev/null || true
find /var/www/html -name '*.bak' -type f -mtime +1 -delete 2>/dev/null || true

if command -v snap &>/dev/null; then
  snap list --all 2>/dev/null | awk '/disabled/{print $1, $3}' | while read -r name rev; do
    snap remove "$name" --revision="$rev" 2>/dev/null || true
  done
fi

ROOT_AVAIL_KB_NOW=$(df / | awk 'NR==2 {print $4}')
FREE_GB=$(( ROOT_AVAIL_KB_NOW / 1024 / 1024 ))
echo "[$(date)] Done. Free: ${FREE_GB}GB"
