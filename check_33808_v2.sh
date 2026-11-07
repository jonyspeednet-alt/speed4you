#!/bin/bash
PGPASSWORD="${DB_PASSWORD:?Set DB_PASSWORD before running}" psql -h localhost -p 5432 -U postgres -d isp_entertainment -c "SELECT id, title, type, status, slug, root_id, year, poster, backdrop, description FROM content_items WHERE id = 33808;"
