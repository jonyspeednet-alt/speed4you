#!/usr/bin/env python3
"""Compare only TV_Series dirs (not movies) vs published DB entries."""
import json, os, subprocess, sys, re
from tempfile import NamedTemporaryFile

env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
def psql(query):
    with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        fname = f.name; f.write(query + '\n')
    cmd = ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-t', '-A', '-f', fname]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    os.unlink(fname)
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]

def normalize(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

# ===== Only scan TV_Series root dirs =====
TV_ROOTS = [
    '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E',
    '/var/www/html/TV_Series/TV_Web_Series-F-M',
    '/var/www/html/TV_Series/TV_Web_Series-N-S',
    '/var/www/html/TV_Series/TV_Web_Series-T',
    '/var/www/html/TV_Series/TV_Web_Series-U-Z',
    '/var/www/html/Requested/Series',
]
disk_dirs = {}  # normalized -> (display_name, path)
for root in TV_ROOTS:
    if os.path.isdir(root):
        for entry in sorted(os.listdir(root)):
            epath = os.path.join(root, entry)
            if os.path.isdir(epath):
                disk_dirs[normalize(entry)] = (entry, epath)

# Flat dirs in TV_Series (like "Anime")
for entry in os.listdir('/var/www/html/TV_Series'):
    epath = os.path.join('/var/www/html/TV_Series', entry)
    if os.path.isdir(epath) and not entry.startswith('TV_Web_Series'):
        disk_dirs[normalize(entry)] = (entry, epath)

print(f"TV series dirs on disk: {len(disk_dirs)}")

# ===== Get all published series from DB =====
rows = psql("SELECT id, payload->>'title', payload->'seasons'->0->>'sourcePath' FROM content_catalog WHERE content_type='series' AND status='published' ORDER BY id;")
print(f"Published series in DB: {len(rows)}")

db_info = {}  # normalized -> (id, title, srcpath)
for row in rows:
    p = row.split('|', 2)
    if len(p) < 3: continue
    sid, title, src = p[0], p[1], p[2] if len(p) > 2 else ''
    db_info[normalize(title)] = (sid, title, src)

# ===== Find disk-only (truly missing from DB) =====
disk_missing = []
for nd, (dname, dpath) in sorted(disk_dirs.items()):
    found = False
    for ndb in db_info:
        if nd == ndb or nd in ndb or ndb in nd:
            found = True
            break
    if not found:
        disk_missing.append((dname, dpath))

print(f"\n=== Series on disk BUT NOT published in DB: {len(disk_missing)} ===")
for name, path in disk_missing:
    # Check if maybe it's in DB as draft
    rows2 = psql(f"SELECT id, status FROM content_catalog WHERE content_type='series' AND LOWER(payload->>'title') LIKE '%{normalize(name)}%' LIMIT 1;")
    in_db_status = ''
    if rows2:
        in_db_status = f'(DB exists: {rows2[0]})'
    print(f"  {name} -> {path} {in_db_status}")

# ===== Find DB-only (broken sourcePath) =====
print(f"\n=== Published in DB but NO matching disk dir: ===")
for ndb, (sid, title, src) in sorted(db_info.items()):
    # Find matching disk dir
    found_disk = False
    for nd in disk_dirs:
        if ndb == nd or ndb in nd or nd in ndb:
            found_disk = True
            break
    if not found_disk:
        print(f"  [{sid}] {title}")
        print(f"        sourcePath: {src[:90] if src else 'N/A'}")
