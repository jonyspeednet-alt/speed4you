cd /home/speed4you/portal-app/backend
grep -E 'DATABASE_URL|PGDATABASE|PGHOST|PGUSER' .env 2>/dev/null | head -5
echo "---"
# Check if there's a config directory with connection info
cat .env 2>/dev/null | grep -v '^#' | grep -v '^$' | head -10
echo "---"
find . -name "*.json" -path "*/data/*" 2>/dev/null | head -10