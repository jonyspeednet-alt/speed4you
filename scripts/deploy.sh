#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "--- Starting Remote Deployment Script ---"

# --- Utility Functions ---
run_sudo() {
  echo "Executing command with sudo: $@"
  printf '%s\n' "$SUDO_PASSWORD" | sudo -S -p '' "$@"
}

resolve_service_name() {
  for candidate in "$SERVICE_NAME" 'isp-portal-backend.service' 'isp-portal-backend' 'isp-portal.service' 'isp-portal' 'portal-backend' 'portal-app'; do
    if [ -n "$candidate" ] && systemctl list-unit-files --type=service --all 2>/dev/null | grep -Fq "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

wait_for_port_release() {
  echo "Waiting for port $REMOTE_PORT to be released..."
  for _ in $(seq 1 20); do
    if ! run_sudo lsof -iTCP:$REMOTE_PORT -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Port $REMOTE_PORT is free."
      return 0
    fi
    sleep 1
  done
  echo "Warning: Port $REMOTE_PORT was not released after 20 seconds."
  return 1
}

stop_backend_processes() {
  echo "Stopping any existing backend processes..."
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo "Killing process with PID $OLD_PID from PID file."
      kill "$OLD_PID" || true
      sleep 2
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
  fi

  PORT_PIDS=$(run_sudo lsof -t -iTCP:$REMOTE_PORT -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "Attempting to kill processes on port $REMOTE_PORT: $PORT_PIDS"
    run_sudo kill $PORT_PIDS || true
    sleep 2
    run_sudo kill -9 $PORT_PIDS || true
  fi
  wait_for_port_release || true
}

print_service_diagnostics() {
  SERVICE_TO_REPORT="$1"
  if [ -z "$SERVICE_TO_REPORT" ]; then return 0; fi
  echo "--- Service Diagnostics for $SERVICE_TO_REPORT ---" >&2
  echo "--- systemctl status ---" >&2
  run_sudo systemctl status "$SERVICE_TO_REPORT" --no-pager -l >&2 || true
  echo "--- journalctl (last 50 lines) ---" >&2
  run_sudo journalctl -u "$SERVICE_TO_REPORT" --no-pager -n 50 >&2 || true
  echo "--- End of Service Diagnostics ---" >&2
}

# --- Main Deployment Logic ---

# 1. Backup
echo "Creating backup directory..."
BACKUP_ROOT="$BACKUP_BASE/$TIMESTAMP"
mkdir -p "$BACKUP_ROOT/frontend" "$BACKUP_ROOT/backend-data"

echo "Backing up existing frontend..."
if [ -d "$FRONTEND_PATH" ]; then
  run_sudo cp -a "$FRONTEND_PATH/." "$BACKUP_ROOT/frontend/" || true
fi

echo "Backing up existing backend data files..."
mkdir -p "$BACKEND_PATH/src/data"
for file in catalog.json scanner-log.json scanner-roots.json scanner-runtime.json scanner-state.json; do
  if [ -f "$BACKEND_PATH/src/data/$file" ]; then
    cp -a "$BACKEND_PATH/src/data/$file" "$BACKUP_ROOT/backend-data/$file"
  fi
done

# 2. Deploy new files
echo "Deploying new frontend..."
run_sudo mkdir -p "$FRONTEND_PATH"
run_sudo find "$FRONTEND_PATH" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
run_sudo cp -r "$STAGING_ROOT/dist/." "$FRONTEND_PATH/"
run_sudo chown -R www-data:www-data "$FRONTEND_PATH"

echo "Deploying new backend..."
mkdir -p "$BACKEND_PATH"
rsync -a --delete "$STAGING_ROOT/backend/" "$BACKEND_PATH/"

echo "Restoring backend data files..."
for file in catalog.json scanner-log.json scanner-roots.json scanner-runtime.json scanner-state.json; do
  if [ -f "$BACKUP_ROOT/backend-data/$file" ]; then
    cp -a "$BACKUP_ROOT/backend-data/$file" "$BACKEND_PATH/src/data/$file"
  fi
done

# 3. Install backend dependencies
echo "Installing backend dependencies..."
cd "$BACKEND_PATH"
npm ci --omit=dev

# 4. Create .env file
echo "Configuring backend environment (.env file)..."
if [ -n "$DEPLOY_ENV_FILE_CONTENT" ]; then
    echo "Writing .env file from provided secret."
    echo "$DEPLOY_ENV_FILE_CONTENT" > "$BACKEND_PATH/.env"
else
    echo "Writing default .env file."
    cat > "$BACKEND_PATH/.env" <<EOF
PORT=${REMOTE_PORT}
CORS_ALLOWED_ORIGINS=${REMOTE_CORS_ALLOWED_ORIGINS}
PLAYER_CACHE_ROOT=${REMOTE_PLAYER_CACHE_ROOT}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=isp_entertainment
DB_USER=postgres
DB_PASSWORD=postgres
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
EOF
fi

# 5. Restart backend service
echo "Restarting backend service..."
stop_backend_processes

RESOLVED_SERVICE_NAME=$(resolve_service_name || true)
if [ -n "$RESOLVED_SERVICE_NAME" ]; then
  echo "Restarting using systemd service: $RESOLVED_SERVICE_NAME"
  run_sudo systemctl daemon-reload
  run_sudo systemctl stop "$RESOLVED_SERVICE_NAME" || true
  if ! run_sudo systemctl start "$RESOLVED_SERVICE_NAME"; then
    print_service_diagnostics "$RESOLVED_SERVICE_NAME"
    exit 1
  fi
else
  echo "Restarting using nohup..."
  cd "$BACKEND_PATH"
  nohup /usr/bin/node src/index.js > "$BACKEND_PATH/server.log" 2> "$BACKEND_PATH/server.err.log" < /dev/null &
  echo $! > "$PID_FILE"
fi

# 6. Health Check
echo "Performing health check..."
sleep 5
HEALTH_OK=0
for attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:$REMOTE_PORT/health; then
    echo "Health check PASSED."
    HEALTH_OK=1
    break
  fi
  echo "Waiting for backend to start (attempt $attempt/60)..."
  sleep 2
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo "--- Backend health check FAILED after restart. ---" >&2
  if [ -n "$RESOLVED_SERVICE_NAME" ]; then
    print_service_diagnostics "$RESOLVED_SERVICE_NAME"
  fi
  exit 1
fi

# 7. Cleanup
echo "Cleaning up staging directory..."
rm -rf "$STAGING_ROOT"

echo "--- Remote Deployment Script Finished Successfully ---"
