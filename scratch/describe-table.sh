PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -U postgres -d isp_entertainment -c "\d content_catalog"
