#!/usr/bin/env python3
"""Check what was actually added."""
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

# Check entries with high IDs
max_id = psql("SELECT MAX(id) FROM content_catalog;")
print(f"Max ID: {max_id[0] if max_id else '?'}")

# Check entries above 33357
high = psql("SELECT id, status, payload->>'title' FROM content_catalog WHERE id > 33357 ORDER BY id;")
print(f"\nEntries with ID > 33357 ({len(high)}):")
for h in high: print(f"  {h}")

# Check entries with specific new titles
titles = ['Game of Thrones', 'House of the Dragon', 'Vikings', 'Shogun', 'Asur', 'Breaking Bad', '1899']
for t in titles:
    rows = psql(f"SELECT id, status FROM content_catalog WHERE content_type='series' AND payload->>'title' = '{t}' ORDER BY id;")
    if rows:
        for r in rows: print(f"  '{t}' -> {r}")
    else:
        print(f"  '{t}' -> NOT FOUND")
