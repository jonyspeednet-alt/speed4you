# Write SQL file on server
ssh speed4you@***REMOVED*** -p 2973 'bash -s' << 'EOF'
PGPASSWORD=postgres psql -U postgres -d isp_portal -c "SELECT key, substring(value::text, 1, 500) as val FROM app_state WHERE key LIKE '%normaliz%'"
EOF
