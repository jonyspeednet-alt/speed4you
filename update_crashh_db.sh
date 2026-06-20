#!/bin/bash
PGPASSWORD=postgres psql -h localhost -U postgres -d isp_entertainment <<'EOF'
DO $$
DECLARE
    payload_json JSONB;
    episode_idx INT;
    eps JSONB;
    old_url TEXT;
    old_path TEXT;
    new_url TEXT;
    new_path TEXT;
BEGIN
    SELECT payload INTO payload_json FROM content_catalog WHERE id = 20790;

    FOR episode_idx IN 0..jsonb_array_length(payload_json->'seasons'->0->'episodes')-1 LOOP
        eps := payload_json->'seasons'->0->'episodes'->episode_idx;
        old_url := eps->>'videoUrl';
        old_path := eps->>'sourcePath';

        new_url := replace(old_url, '.mkv', '.mp4');
        new_path := replace(old_path, '.mkv', '.mp4');

        payload_json := jsonb_set(payload_json, 
            ARRAY['seasons','0','episodes',episode_idx::text,'videoUrl'], 
            to_jsonb(new_url));
        payload_json := jsonb_set(payload_json, 
            ARRAY['seasons','0','episodes',episode_idx::text,'sourcePath'], 
            to_jsonb(new_path));
    END LOOP;

    UPDATE content_catalog SET payload = payload_json WHERE id = 20790;
    RAISE NOTICE 'Updated all episodes for Crashh (ID: 20790)';
END $$;
EOF
