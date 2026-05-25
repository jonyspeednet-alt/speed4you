# Find and kill the backend process
PID=$(pgrep -f "node.*src/index.js" | head -1)
echo "Backend PID: $PID"
if [ -n "$PID" ]; then
  kill "$PID"
  echo "Killed PID $PID, waiting for systemd restart..."
  sleep 6
  pgrep -f "node.*src/index.js" | head -1 && echo "Restarted OK" || echo "Not running yet"
else
  echo "No backend process found"
fi

# Also kill any stale pipeline workers
pkill -f "pipeline-runner.*--scanner" 2>/dev/null || true
pkill -f "pipeline-runner.*--normalizer" 2>/dev/null || true
echo "Cleanup done"