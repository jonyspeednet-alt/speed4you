#!/usr/bin/env python3
"""Step 1: Fix DB-only series sourcePaths. Step 2: Add disk-only series."""
import json, os, subprocess, sys, re
from urllib.parse import quote
from tempfile import NamedTemporaryFile

env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
def psql(query):
    with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        fname = f.name; f.write(query + '\n')
    cmd = ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-t', '-A', '-f', fname]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    os.unlink(fname)
    if r.returncode != 0:
        if r.stderr.strip(): print(f"psql err: {r.stderr[:200]}", file=sys.stderr)
        return []
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]

def normalize(s):
    s = re.sub(r'[^a-z0-9]', ' ', s.lower())
    s = re.sub(r'\s+', ' ', s).strip()
    if s.startswith('the '): s = s[4:]
    return s

# ============================================================
# Discover all series dirs on disk
# ============================================================
disk_dirs = {}  # normalized -> absolute path
for root_dir in ['/var/www/html/TV_Series/TV_Web_Series-0-9_A-E',
                 '/var/www/html/TV_Series/TV_Web_Series-F-M',
                 '/var/www/html/TV_Series/TV_Web_Series-N-S',
                 '/var/www/html/TV_Series/TV_Web_Series-T',
                 '/var/www/html/TV_Series/TV_Web_Series-U-Z',
                 '/var/www/html/Requested/Series',
                 '/var/www/html/Cartoon_Movies/Cartoon',
                 '/var/www/html/Cartoon_Movies/2023',
                 '/var/www/html/English_Movies/2022',
                 '/var/www/html/English_Movies']:
    if os.path.isdir(root_dir):
        for entry in sorted(os.listdir(root_dir)):
            epath = os.path.join(root_dir, entry)
            if os.path.isdir(epath):
                disk_dirs[normalize(entry)] = epath

# Also check flat dirs in TV_Series
tv_root = '/var/www/html/TV_Series'
if os.path.isdir(tv_root):
    for entry in sorted(os.listdir(tv_root)):
        epath = os.path.join(tv_root, entry)
        if os.path.isdir(epath) and not entry.startswith('TV_Web_Series'):
            disk_dirs[normalize(entry)] = epath

print(f"Total disk dirs found: {len(disk_dirs)}")

# ============================================================
# Fix 24 DB-only entries
# ============================================================
rows = psql("SELECT id, payload->>'title', payload->'seasons'->0->>'sourcePath' FROM content_catalog WHERE content_type='series' AND status='published' ORDER BY id;")
print(f"Total published series in DB: {len(rows)}")

fixed = 0
for row in rows:
    parts = row.split('|', 2)
    if len(parts) < 3: continue
    sid, title, src = int(parts[0]), parts[1], parts[2] if len(parts) > 2 else ''
    if not src: continue
    
    src_dir = os.path.dirname(src.rstrip('/'))
    # Check if sourcePath dir exists
    if os.path.isdir(src_dir): continue  # All good
    
    # SourcePath is broken - find matching disk dir
    ntitle = normalize(title)
    candidates = []
    for nd, path in disk_dirs.items():
        if ntitle == nd or ntitle in nd or nd in ntitle:
            candidates.append((nd, path))
    
    if not candidates:
        # Try more aggressive matching: skip non-alpha chars
        for nd, path in disk_dirs.items():
            nnd = re.sub(r'[^a-z0-9]', '', nd)
            nnt = re.sub(r'[^a-z0-9]', '', ntitle)
            if nnd == nnt or nnd in nnt or nnt in nnd:
                candidates.append((nd, path))
    
    if len(candidates) == 1:
        nd, new_dir = candidates[0]
        # Find season dir
        seasons_found = []
        for e in os.listdir(new_dir):
            ep = os.path.join(new_dir, e)
            if os.path.isdir(ep) and re.match(r'[Ss]eason\s*\d+|S\d+', e):
                seasons_found.append(e)
        if not seasons_found:
            # No season dirs - might be flat structure
            pass
        
        fix_sql = f"UPDATE content_catalog SET payload = jsonb_set(payload, '{{seasons,0,sourcePath}}', '\"{new_dir}\"') WHERE id = {sid};"
        psql(fix_sql)
        print(f"  [{sid}] {title}: {src[:60]} -> {new_dir}")
        fixed += 1
    elif len(candidates) > 1:
        print(f"  [{sid}] {title}: MULTIPLE candidates: {[c[0] for c in candidates]}")
    else:
        print(f"  [{sid}] {title}: NO disk match found")

print(f"\nFixed {fixed} DB-only entries")

# ============================================================
# Check disk-only series status in DB (maybe as draft)
# ============================================================
print("\n=== Disk-only series: checking DB status ===")
disk_not_in_db = []
for norm_name, abs_path in sorted(disk_dirs.items()):
    # Check if any DB entry has this path in source
    rows2 = psql(f"SELECT id, status, payload->>'title' FROM content_catalog WHERE payload->'seasons'->0->>'sourcePath' LIKE '{abs_path}%' AND content_type='series' LIMIT 1;")
    if not rows2:
        disk_not_in_db.append((norm_name, abs_path))
    else:
        for r2 in rows2:
            p = r2.split('|')
            print(f"  Disk '{os.path.basename(abs_path)}' -> DB [{p[0]}] '{p[2]}' (status: {p[1] if len(p)>1 else '?'})")

print(f"\nDisk series NOT in DB at all: {len(disk_not_in_db)}")
for n, p in disk_not_in_db:
    print(f"  {n} -> {p}")
