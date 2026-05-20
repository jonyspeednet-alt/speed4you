PGPASSWORD=postgres psql -h localhost -U postgres -d isp_entertainment -c "SELECT language, COUNT(*) FROM content_catalog GROUP BY language ORDER BY count DESC LIMIT 20;"
