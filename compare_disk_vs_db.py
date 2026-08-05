#!/usr/bin/env python3
import json, os, subprocess, sys, re

# Get all series directories from disk
disk_series = set()
for root_dir in ['/var/www/html/TV_Series/TV_Web_Series-0-9_A-E',
                 '/var/www/html/TV_Series/TV_Web_Series-F-M',
                 '/var/www/html/TV_Series/TV_Web_Series-N-S',
                 '/var/www/html/TV_Series/TV_Web_Series-T',
                 '/var/www/html/TV_Series/TV_Web_Series-U-Z',
                 '/var/www/html/Requested/Series']:
    if os.path.isdir(root_dir):
        for entry in os.listdir(root_dir):
            epath = os.path.join(root_dir, entry)
            if os.path.isdir(epath):
                disk_series.add(entry.lower().strip())

# Also check flat series dirs in TV_Series
tv_root = '/var/www/html/TV_Series'
if os.path.isdir(tv_root):
    for entry in os.listdir(tv_root):
        epath = os.path.join(tv_root, entry)
        if os.path.isdir(epath) and not entry.startswith('TV_Web_Series'):
            disk_series.add(entry.lower().strip())

# Get all published series from DB
env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
cmd = ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment',
       '-t', '-A', '-c', "SELECT id, LOWER(payload->>'title'), payload->>'title' as raw_title, payload->'seasons'->0->>'sourcePath' as path FROM content_catalog WHERE content_type='series' AND status='published' ORDER BY id;"]
r = subprocess.run(cmd, capture_output=True, text=True, env=env)
rows = [l.strip() for l in r.stdout.split('\n') if l.strip()]

db_titles = {}  # lowercase title -> (id, raw_title, path)
for row in rows:
    parts = row.split('|', 3)
    if len(parts) >= 4:
        sid, ltitle, raw, path = parts[0], parts[1], parts[2], parts[3]
        db_titles[ltitle.strip()] = (sid, raw.strip(), path.strip())

# Find disk-only (not in DB)
disk_not_in_db = []
for ds in sorted(disk_series):
    # Try direct match
    if ds in db_titles:
        continue
    # Normalize: remove common noise, collapse spaces
    def normalize(s):
        s = re.sub(r'[^a-z0-9 ]', ' ', s)
        s = re.sub(r'\s+', ' ', s).strip()
        # Remove leading "the "
        if s.startswith('the '): s = s[4:]
        return s
    nds = normalize(ds)
    found = False
    for dbt in db_titles:
        ndbt = normalize(dbt)
        if nds == ndbt or nds in ndbt or ndbt in nds:
            found = True
            break
        # Check if one starts with the other (e.g., "vikings" vs "vikings (complete)")
        if nds.startswith(ndbt) or ndbt.startswith(nds):
            found = True
            break
    if not found:
        disk_not_in_db.append(ds)

# Build normalized disk lookup
normalized_disk = {}
for ds in disk_series:
    nds = normalize(ds)
    normalized_disk[nds] = ds

# Find DB-only (no matching disk dir found)
db_not_on_disk = []
for ltitle, (sid, raw, path) in db_titles.items():
    nlt = normalize(ltitle)
    found = False
    for nds in normalized_disk:
        if nlt == nds or nlt in nds or nds in nlt:
            found = True
            break
    if not found:
        db_not_on_disk.append((sid, raw, path))

print(f"=== DISK SERIES (total: {len(disk_series)}) ===")
print(f"=== DB SERIES (total: {len(db_titles)}) ===")
print(f"=== DISK ONLY (not in DB): {len(disk_not_in_db)} ===")
for d in disk_not_in_db:
    print(f"  {d}")
print(f"\n=== DB ONLY (disk dir missing): {len(db_not_on_disk)} ===")
for sid, raw, path in db_not_on_disk[:30]:
    print(f"  [{sid}] {raw} -> {path[:80] if path else 'N/A'}")
if len(db_not_on_disk) > 30:
    print(f"  ... and {len(db_not_on_disk)-30} more")
