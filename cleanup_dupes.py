#!/usr/bin/env python3
"""Remove duplicate entries created by the comprehensive fix."""
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

# Find duplicate sourcePaths
rows = psql("SELECT id, payload->>'title', payload->'seasons'->0->>'sourcePath' as src FROM content_catalog WHERE content_type='series' AND status='published' ORDER BY src;")

prev_src = None
dupes = []
for row in rows:
    p = row.split('|', 2)
    if len(p) < 3: continue
    sid, title, src = p[0], p[1], p[2] if len(p) > 2 else ''
    if src == prev_src:
        dupes.append((sid, title, src))
    prev_src = src

print(f"Duplicates found: {len(dupes)}")
for sid, title, src in dupes:
    # Delete the duplicate (keep the lower ID which is the original)
    psql(f"DELETE FROM content_catalog WHERE id = {sid};")
    print(f"  DELETED [{sid}] {title}")

# Count total published series
total = psql("SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='published';")
print(f"\nTotal published series now: {total[0] if total else '?'}")
