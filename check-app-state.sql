SELECT key, value FROM app_state WHERE key ILIKE '%scan%' OR key ILIKE '%cache%' OR key ILIKE '%catalog%';
