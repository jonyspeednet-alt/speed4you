#!/bin/bash
PGPASSWORD=REDACTED_DB_PASSWORD psql -h localhost -U postgres -d isp_entertainment <<EOF
SELECT id, payload->>'title' AS title, payload->>'sourcePath' AS sourcePath, payload->>'videoUrl' AS videoUrl, content_type 
FROM content_catalog WHERE id = 20790;
EOF
