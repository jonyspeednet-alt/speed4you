#!/bin/bash
cd /home/speed4you/portal-app/backend
source .env
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT id, title, status, metadata_status, metadata_confidence, source_type, source_root_id FROM content_catalog WHERE id = 33807;"
