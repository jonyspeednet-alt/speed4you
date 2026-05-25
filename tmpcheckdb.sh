cd /home/speed4you/portal-app/backend
psql -d "$(grep PGDATABASE .env | cut -d'=' -f2)" -c "SELECT LEFT(value::text, 2000) FROM app_state WHERE key = 'pipeline_queue';" 2>/dev/null || echo DB_QUERY_FAILED
echo SEP
psql -d "$(grep PGDATABASE .env | cut -d'=' -f2)" -c "SELECT LEFT(value::text, 500) FROM app_state WHERE key = 'pipeline_log';" 2>/dev/null
echo SEP
psql -d "$(grep PGDATABASE .env | cut -d'=' -f2)" -c "SELECT LEFT(value::text, 200) FROM app_state WHERE key = 'pipeline_lock';" 2>/dev/null