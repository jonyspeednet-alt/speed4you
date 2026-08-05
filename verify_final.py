#!/usr/bin/env python3
"""Verify key series are correct."""
import subprocess, os
from tempfile import NamedTemporaryFile

env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
def psql(query):
    with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        fname = f.name; f.write(query + '\n')
    r = subprocess.run(['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-t', '-A', '-f', fname],
                       capture_output=True, text=True, env=env)
    os.unlink(fname)
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]

# Check specific series
ids_to_check = [31377, 32600, 33377, 33378, 33390, 33386, 33367, 32685, 32249]
for sid in ids_to_check:
    rows = psql(f"SELECT id, status, payload->>'title', payload->'seasons'->0->>'sourcePath' FROM content_catalog WHERE id={sid};")
    if rows:
        print(f'  [{sid}] EXISTS: {rows[0]}')
    else:
        print(f'  [{sid}] NOT FOUND (deleted)')

# Count by status
for st in ['published', 'draft']:
    cnt = psql(f"SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='{st}';")
    print(f"{st}: {cnt[0] if cnt else 0}")

# Check for any remaining entries pointing to English_Movies
bad = psql("SELECT id, payload->>'title' FROM content_catalog WHERE content_type='series' AND payload->'seasons'->0->>'sourcePath' LIKE '%English_Movies%' AND status='published';")
print(f"\nSeries still pointing to English_Movies: {len(bad)}")
for b in bad: print(f"  {b}")
