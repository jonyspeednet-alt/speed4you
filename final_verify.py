#!/usr/bin/env python3
"""Verify final state of key series."""
import subprocess, os
from tempfile import NamedTemporaryFile

env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
def psql(query):
    with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        fname = f.name; f.write(query + '\n')
    r = subprocess.run(['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-t', '-A', '-f', fname], capture_output=True, text=True, env=env)
    os.unlink(fname)
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]

# Key new series
print("=== Key new series ===")
for sid in [33375, 33376, 33387, 33383, 33367]:
    rows = psql(f"SELECT id, payload->>'title', payload->'seasons'->0->'episodes'->0->>'sourcePath' FROM content_catalog WHERE id={sid};")
    sp = rows[0].split('|', 2) if rows else []
    if sp:
        exists = os.path.isfile(sp[2]) if len(sp) > 2 and sp[2] else False
        print(f"  [{sp[0]}] {sp[1]}: file exists={exists}")

# Total published
pub = psql("SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='published';")
print(f"\nTotal published: {pub[0] if pub else '?'}")

# Still broken entries (English_Movies, etc.)
bad = psql("SELECT id, payload->>'title' FROM content_catalog WHERE content_type='series' AND status='published' AND payload->'seasons'->0->>'sourcePath' LIKE '%English_Movies%';")
print(f"\nStill pointing to English_Movies: {len(bad)}")
for b in bad: print(f"  {b}")
