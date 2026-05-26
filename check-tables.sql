SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%scan%' OR table_name LIKE '%state%' ORDER BY table_name;
