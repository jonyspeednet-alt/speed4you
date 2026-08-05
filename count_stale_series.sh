#!/bin/bash
export $(grep -v '^\s*#' /home/speed4you/portal-app/backend/.env | xargs)

# Find all series and count their episodes
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT id, title, 
  (SELECT count(*) FROM jsonb_array_elements(payload->'seasons') s, jsonb_array_elements(s->'episodes') e) as ep_count
FROM content_catalog 
WHERE content_type = 'series' AND status = 'published'
ORDER BY id;
"
