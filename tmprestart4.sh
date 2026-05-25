PID=$(pgrep -f "node.*src/index.js" | head -1)
echo "Backend PID: $PID"
if [ -n "$PID" ]; then
  kill "$PID"
  echo "Killed, waiting for systemd restart (6s)..."
  sleep 6
  NEWPID=$(pgrep -f "node.*src/index.js" | head -1)
  echo "New PID: $NEWPID"
  if [ -n "$NEWPID" ]; then echo "Backend restarted OK"; else echo "Backend NOT running"; fi
fi