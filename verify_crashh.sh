#!/bin/bash
PGPASSWORD=postgres psql -h localhost -U postgres -d isp_entertainment -c "SELECT jsonb_pretty(jsonb_agg(jsonb_build_object('episode', e->>'number', 'videoUrl', e->>'videoUrl', 'sourcePath', e->>'sourcePath'))) AS episodes FROM content_catalog, jsonb_array_elements(payload->'seasons'->0->'episodes') AS e WHERE id = 20790;"
