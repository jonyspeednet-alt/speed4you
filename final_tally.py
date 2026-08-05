#!/usr/bin/env python3
"""Final tally and quick duplicate check."""
import subprocess, os
from tempfile import NamedTemporaryFile

env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
def psql(query):
    with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        fname = f.name; f.write(query + '\n')
    r = subprocess.run(['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-f', fname], capture_output=True, text=True, env=env)
    os.unlink(fname)
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]

pub = psql("SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='published';")
print(f"Total published series: {pub[0] if pub else '?'}")

# Check for duplicate sourcePaths
dupes = psql("""
    SELECT src, COUNT(*), string_agg(id::text || ':' || COALESCE(payload->>'title','?'), ',')
    FROM (
        SELECT payload->'seasons'->0->>'sourcePath' as src, id, payload
        FROM content_catalog WHERE content_type='series' AND status='published'
    ) sub
    WHERE src IS NOT NULL AND src != ''
    GROUP BY src HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC;
""")
print(f"\nDuplicate sourcePaths: {len(dupes)}")
for d in dupes:
    print(f"  {d[:150]}")

# Also check how many were added vs original
added = psql("SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='published' AND id >= 33362;")
print(f"\nNewly added series (ID >= 33362): {added[0] if added else '?'}")
