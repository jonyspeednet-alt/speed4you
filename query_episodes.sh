#!/bin/bash
PGPASSWORD=postgres psql -h localhost -U postgres -d isp_entertainment <<EOF
SELECT jsonb_pretty(payload->'seasons') AS seasons
FROM content_catalog WHERE id = 20790;
EOF
