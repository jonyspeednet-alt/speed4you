#!/bin/bash
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"
echo "=== FINAL VERIFICATION ==="
$PG -c "SELECT COUNT(*) as total, COUNT(CASE WHEN status='published' THEN 1 END) as published, COUNT(CASE WHEN duplicate_count > 0 THEN 1 END) as duplicates FROM content_catalog"
