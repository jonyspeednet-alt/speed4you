#!/bin/bash
export $(grep -v '^\s*#' /home/speed4you/portal-app/backend/.env | xargs)

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
UPDATE content_catalog
SET
  category = 'Action',
  title_key = 'one piece the beginning and the end',
  payload = jsonb_set(
    jsonb_set(
      jsonb_set(
        payload,
        '{category}', '"Action"'
      ),
      '{originalTitle}', '""'
    ),
    '{titleKey}', '"one piece the beginning and the end"'
  )
WHERE id = 33037;
SQL
