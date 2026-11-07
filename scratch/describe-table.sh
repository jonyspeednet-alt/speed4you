PGPASSWORD="${DB_PASSWORD:?Set DB_PASSWORD before running}" psql -h localhost -U postgres -d isp_entertainment -c "\d content_catalog"
