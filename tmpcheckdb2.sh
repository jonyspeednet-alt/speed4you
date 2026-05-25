source /home/speed4you/portal-app/backend/.env 2>/dev/null || true
DB="${DATABASE_URL:-$DATABASE_URL}"
echo "Using DB: ${DB:0:40}..."
psql "${DB}" -c "SELECT key, LEFT(value::text, 80) as value_preview FROM app_state WHERE key LIKE 'pipeline%' ORDER BY key;" 2>/dev/null || echo "psql failed"
echo "---"
psql "${DB}" -c "SELECT COUNT(*) as total_rows FROM app_state;" 2>/dev/null