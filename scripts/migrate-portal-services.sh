#!/usr/bin/env bash
set -euo pipefail

backend_unit=isp-portal.service
runner_unit=actions.runner.jonyspeednet-alt-speed4you.speed4you-server.service
backend_dropin="/etc/systemd/system/$backend_unit.d/90-portal-account.conf"
runner_dropin="/etc/systemd/system/$runner_unit.d/90-portal-account.conf"
backend_dir=/var/lib/portal-backend/backend
runner_dir=/var/lib/portal-runner/actions-runner

test "$(id -u)" -eq 0
test ! -e "$backend_dropin"
test ! -e "$runner_dropin"
test -x "$runner_dir/runsvc.sh"
test -f "$backend_dir/.env"

rollback() {
  rm -f -- "$backend_dropin" "$runner_dropin"
  systemctl daemon-reload
  systemctl restart "$backend_unit" "$runner_unit"
}
trap rollback ERR

install -d "${backend_dropin%/*}" "${runner_dropin%/*}"
cat > "$backend_dropin" <<EOF
[Service]
User=portal-backend
Group=portal-backend
WorkingDirectory=$backend_dir
EOF
cat > "$runner_dropin" <<EOF
[Service]
User=portal-runner
Group=portal-runner
WorkingDirectory=$runner_dir
ExecStart=
ExecStart=$runner_dir/runsvc.sh
EOF

systemctl stop "$backend_unit"
rsync -a --chown=portal-backend:portal-backend /home/speed4you/portal-app/backend/ "$backend_dir/"
chmod 600 "$backend_dir/.env"
install -d -m 750 -o portal-backend -g portal-backend /var/lib/portal-backend/scanner-cache /var/lib/portal-backend/player-cache
sed -i -e '/^SCANNER_CACHE_DIR=/d' -e '/^PLAYER_CACHE_ROOT=/d' "$backend_dir/.env"
printf '\nSCANNER_CACHE_DIR=/var/lib/portal-backend/scanner-cache\nPLAYER_CACHE_ROOT=/var/lib/portal-backend/player-cache\n' >> "$backend_dir/.env"
systemctl daemon-reload
systemctl start "$backend_unit"
healthy=0
for attempt in {1..20}; do
  if curl -fsS --max-time 2 http://127.0.0.1:4100/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done
test "$healthy" -eq 1

systemctl restart "$runner_unit"
systemctl is-active --quiet "$runner_unit"
trap - ERR
systemctl show "$backend_unit" "$runner_unit" -p User -p WorkingDirectory -p ActiveState
