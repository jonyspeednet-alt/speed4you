#!/bin/bash
# Restart backend to clear in-memory caches
PID_FILE=/home/speed4you/portal-app/backend.pid
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill -HUP "$PID" 2>/dev/null && echo "Sent HUP to PID $PID"
fi
sleep 2
curl -s http://localhost:4100/health
