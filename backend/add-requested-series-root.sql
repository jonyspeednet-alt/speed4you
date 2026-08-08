UPDATE app_state 
SET value = value::jsonb || '[{"id": "requested-series", "type": "series", "label": "Requested Series", "category": "TV Series", "language": "Multi", "scanPath": "/var/www/html/Requested/Series", "publicBaseUrl": "/Requested/Series"}]'::jsonb
WHERE key = 'scanner_roots';
