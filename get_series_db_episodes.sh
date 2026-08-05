#!/bin/bash
export $(grep -v '^\s*#' /home/speed4you/portal-app/backend/.env | xargs)

echo "=== 32635 The Test Case ==="
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT jsonb_array_elements(jsonb_array_elements(payload->'seasons')->'episodes')->>'sourcePath' FROM content_catalog WHERE id = 32635;"

echo "=== 32636 The Three Stooges (S01 only) ==="
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT jsonb_array_elements(jsonb_array_elements(payload->'seasons')->'episodes')->>'sourcePath' FROM content_catalog WHERE id = 32636 LIMIT 4;"

echo "=== 32637 The Thundermans ==="
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT jsonb_array_elements(jsonb_array_elements(payload->'seasons')->'episodes')->>'sourcePath' FROM content_catalog WHERE id = 32637 LIMIT 5;"

echo "=== 32638 The Tomorrow People ==="
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT jsonb_array_elements(jsonb_array_elements(payload->'seasons')->'episodes')->>'sourcePath' FROM content_catalog WHERE id = 32638 LIMIT 5;"

echo "=== 32690 Regai ==="
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT jsonb_array_elements(jsonb_array_elements(payload->'seasons')->'episodes')->>'sourcePath' FROM content_catalog WHERE id = 32690;"
