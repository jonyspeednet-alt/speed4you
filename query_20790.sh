#!/bin/bash
# Test sudo access
# Requires SUDO_PASSWORD environment variable

if [ -z "$SUDO_PASSWORD" ]; then
  echo "ERROR: SUDO_PASSWORD environment variable is not set."
  exit 1
fi

printf '%s\n' "$SUDO_PASSWORD" | sudo -S -p '' id
