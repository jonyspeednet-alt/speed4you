PGPASSWORD=postgres psql -h localhost -U postgres -d isp_entertainment -c "SELECT category, count(*) FROM content_catalog GROUP BY category ORDER BY count DESC LIMIT 10;"
PGPASSWORD=postgres psql -h localhost -U postgres -d isp_entertainment -c "SELECT payload->>'genre' as genre, count(*) FROM content_catalog GROUP BY payload->>'genre' ORDER BY count DESC LIMIT 10;"
