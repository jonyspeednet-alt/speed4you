#!/usr/bin/env python3
"""Re-add truly missing series with proper error checking."""
import json, os, subprocess, sys, re
from tempfile import NamedTemporaryFile
from urllib.parse import quote

env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')

def psql(query):
    with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        fname = f.name; f.write(query + '\n')
    cmd = ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-f', fname]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    os.unlink(fname)
    if r.returncode != 0:
        err = r.stderr.strip()
        if err: print(f"ERROR: {err[:200]}", file=sys.stderr)
        return False, r.stderr[:200] if err else 'unknown error'
    return True, '\n'.join([l.strip() for l in r.stdout.split('\n') if l.strip()][:3])

def scan_season_dir(series_dir):
    """Find season subdirs and video files."""
    if not os.path.isdir(series_dir): return []
    seasons = []
    for entry in sorted(os.listdir(series_dir)):
        epath = os.path.join(series_dir, entry)
        if not os.path.isdir(epath): continue
        m = re.match(r'[Ss]eason\s*(\d+)', entry)
        if not m: m = re.match(r'[Ss](\d+)\b', entry)
        if not m: continue
        sn = int(m.group(1))
        files = sorted([f for f in os.listdir(epath) if os.path.isfile(os.path.join(epath, f)) and re.search(r'\.(mkv|mp4|avi|mov|wmv|webm)$', f, re.I)])
        episodes = []
        for i, fn in enumerate(files, 1):
            fpath = os.path.join(epath, fn)
            fpath_url = fpath.replace('/var/www/html', '')
            fpath_url_enc = '/' + '/'.join(quote(p) for p in fpath_url.split(os.sep) if p)
            episodes.append({"id": f"auto-{sn}-{i}", "number": i, "title": f"Episode {i}", "sourcePath": fpath, "videoUrl": fpath_url_enc, "still": "", "description": "", "airDate": "", "runtime": 0, "duration": "", "subtitleUrl": "", "runtimeMinutes": 0, "durationSeconds": 0})
        if episodes:
            seasons.append({"id": f"auto-season-{sn}", "title": f"S{sn}", "number": sn, "sourcePath": epath, "episodes": episodes})
    
    if not seasons:
        # Flat structure
        files = sorted([f for f in os.listdir(series_dir) if os.path.isfile(os.path.join(series_dir, f)) and re.search(r'\.(mkv|mp4|avi|mov|wmv|webm)$', f, re.I)])
        if files:
            episodes = []
            for i, fn in enumerate(files, 1):
                fpath = os.path.join(series_dir, fn)
                fpath_url = fpath.replace('/var/www/html', '')
                fpath_url_enc = '/' + '/'.join(quote(p) for p in fpath_url.split(os.sep) if p)
                episodes.append({"id": f"auto-1-{i}", "number": i, "title": f"Episode {i}", "sourcePath": fpath, "videoUrl": fpath_url_enc, "still": "", "description": "", "airDate": "", "runtime": 0, "duration": "", "subtitleUrl": "", "runtimeMinutes": 0, "durationSeconds": 0})
            seasons.append({"id": "auto-season-1", "title": "S1", "number": 1, "sourcePath": series_dir, "episodes": episodes})
    return seasons

# Series to add (that are NOT already in DB pointing to the same path)
missing = [
    ("13 Reasons Why", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/13 Reasons Why"),
    ("1899", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/1899"),
    ("22April", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/22April"),
    ("50 States of Fright", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/50 States of Fright"),
    ("American Born Chinese", "/var/www/html/Requested/Series/American Born Chinese"),
    ("Asur", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Asur"),
    ("Ballers", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Ballers"),
    ("Bhasan - The Immersion", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Bhasan - The Immersion"),
    ("Black Snow", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Black Snow"),
    ("Boli Bengla", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Boli Bengla"),
    ("Candy", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Candy"),
    ("Crisis on Infinite Earths", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crisis on Infinite Earths"),
    ("Duranga", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Duranga"),
    ("Game of Thrones", "/var/www/html/Requested/Series/Game of thrones"),
    ("House of the Dragon", "/var/www/html/Requested/Series/House of the Dragon"),
    ("Kohrra", "/var/www/html/Requested/Series/Kohrra"),
    ("Mouse", "/var/www/html/Requested/Series/Mouse"),
    ("Parasyte: The Maxim", "/var/www/html/TV_Series/TV_Web_Series-N-S/Parasyte: The Maxim"),
    ("Pritam and Pedro", "/var/www/html/Requested/Series/Pritam and Pedro"),
    ("Rangbaaz (2018)", "/var/www/html/TV_Series/TV_Web_Series-N-S/Rangbaaz (2018)"),
    ("Secrets of Sinauli", "/var/www/html/TV_Series/TV_Web_Series-N-S/Secrets of Sinauli"),
    ("Shogun", "/var/www/html/TV_Series/TV_Web_Series-N-S/Shogun"),
    ("Super Dragon Ball Heroes", "/var/www/html/TV_Series/TV_Web_Series-N-S/Super Dragon Ball Heroes"),
    ("Tale of the Nine-Tailed", "/var/www/html/TV_Series/TV_Web_Series-T/Tale of the Nine-Tailed"),
    ("Teen Bindu", "/var/www/html/TV_Series/TV_Web_Series-T/Teen Bindu"),
    ("Vikings", "/var/www/html/Requested/Series/Vikings"),
    ("Vikings (Complete)", "/var/www/html/Requested/Series/Vikings (Complete)"),
]

# Get next ID
ok, result = psql("SELECT COALESCE(MAX(id), 100000) + 1 FROM content_catalog;")
if not ok: sys.exit(1)
next_id = int(result.split('\n')[0]) if result else 100001
print(f"Starting ID: {next_id}")

for title, disk_path in missing:
    if not os.path.isdir(disk_path):
        print(f"  SKIP {title}: dir not found")
        continue
    
    seasons = scan_season_dir(disk_path)
    if not seasons or sum(len(s.get('episodes',[])) for s in seasons) == 0:
        print(f"  SKIP {title}: no video files")
        continue
    
    ep_count = sum(len(s.get('episodes',[])) for s in seasons)
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    
    payload = {
        "title": title, "type": "series", "status": "published",
        "seasons": seasons, "source": disk_path,
        "episodeCount": ep_count, "seasonCount": len(seasons)
    }
    
    payload_json = json.dumps(payload, ensure_ascii=False).replace("'", "''")
    sql = f"INSERT INTO content_catalog (id, content_type, status, payload) VALUES ({next_id}, 'series', 'published', '{payload_json}'::jsonb);"
    ok, msg = psql(sql)
    if ok:
        print(f"  [{next_id}] {title} -> added ({ep_count} eps)")
        next_id += 1
    else:
        print(f"  FAIL [{next_id}] {title}: {msg}")
        next_id += 1

print(f"\nDone! Final max ID: {next_id - 1}")
