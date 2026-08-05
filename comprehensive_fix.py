#!/usr/bin/env python3
"""Fix sourcePaths for DB-only entries + publish draft series + add truly missing ones."""
import json, os, subprocess, sys, re
from tempfile import NamedTemporaryFile
from urllib.parse import quote

env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
def psql(query, check_err=True):
    with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        fname = f.name; f.write(query + '\n')
    cmd = ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-t', '-A', '-f', fname]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    os.unlink(fname)
    if check_err and r.returncode != 0:
        err = r.stderr.strip()
        if err: print(f"psql ERROR: {err[:300]}", file=sys.stderr)
        return []
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]

def normalize(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

def find_disk_dir(title):
    """Find best matching disk dir for a given title."""
    TV_ROOTS = [
        '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E',
        '/var/www/html/TV_Series/TV_Web_Series-F-M',
        '/var/www/html/TV_Series/TV_Web_Series-N-S',
        '/var/www/html/TV_Series/TV_Web_Series-T',
        '/var/www/html/TV_Series/TV_Web_Series-U-Z',
        '/var/www/html/Requested/Series',
    ]
    ntitle = normalize(title)
    candidates = []
    for root in TV_ROOTS:
        if not os.path.isdir(root): continue
        for entry in os.listdir(root):
            epath = os.path.join(root, entry)
            if not os.path.isdir(epath): continue
            nentry = normalize(entry)
            if nentry == ntitle:
                candidates.insert(0, (entry, epath))  # exact match first
            elif nentry in ntitle or ntitle in nentry:
                candidates.append((entry, epath))
            # Strip leading "The" for comparison
            ntitle_no_the = re.sub(r'^the\s+', '', ntitle)
            nentry_no_the = re.sub(r'^the\s+', '', nentry)
            if nentry_no_the == ntitle_no_the:
                candidates.insert(0, (entry, epath))
    return candidates[0] if candidates else None

def scan_season_dir(series_dir):
    """Find season subdirs and video files."""
    seasons = []
    if not os.path.isdir(series_dir): return seasons
    for entry in os.listdir(series_dir):
        epath = os.path.join(series_dir, entry)
        if not os.path.isdir(epath): continue
        m = re.match(r'[Ss]eason\s*(\d+)', entry)
        if not m: m = re.match(r'[Ss](\d+)\b', entry)
        if not m: continue
        sn = int(m.group(1))
        files = sorted([f for f in os.listdir(epath) 
                       if os.path.isfile(os.path.join(epath, f)) and 
                       re.search(r'\.(mkv|mp4|avi|mov|wmv|webm)$', f, re.I)])
        episodes = []
        for i, fn in enumerate(files, 1):
            fpath = os.path.join(epath, fn)
            fpath_url = fpath.replace('/var/www/html', '')
            fpath_url_enc = '/' + '/'.join(quote(p) for p in fpath_url.split(os.sep) if p)
            episodes.append({
                "id": f"auto-{sn}-{i}",
                "number": i,
                "title": f"Episode {i}",
                "sourcePath": fpath,
                "videoUrl": fpath_url_enc,
                "still": "", "description": "", "airDate": "",
                "runtime": 0, "duration": "", "subtitleUrl": "",
                "runtimeMinutes": 0, "durationSeconds": 0
            })
        if episodes:
            seasons.append({
                "id": f"auto-season-{sn}",
                "title": f"S{sn}",
                "number": sn,
                "sourcePath": epath,
                "episodes": episodes
            })
    return seasons

def make_payload(title, seasons, source_path):
    """Create a basic payload for a series."""
    total_eps = sum(len(s.get('episodes',[])) for s in seasons)
    return {
        "title": title,
        "type": "series",
        "status": "published",
        "seasons": seasons,
        "source": source_path,
        "episodeCount": total_eps,
        "seasonCount": len(seasons)
    }

def get_next_id():
    rows = psql("SELECT COALESCE(MAX(id), 100000) + 1 FROM content_catalog;")
    return int(rows[0]) if rows else 100001

# ================================================================
# STEP 1: Fix sourcePaths for DB entries pointing to wrong dirs
# ================================================================
print("=== STEP 1: Fix DB-only sourcePaths ===")
fix_map = {
    # id -> correct disk dir path (full abs path)
    32685: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/13 Reasons Why',    # 13Mussoorie
    32249: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/13 Reasons Why',     # 13Reasons Why
    32689: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Cubicles Season 2',  # Cubicles Season2
    31490: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Dhoopki Deewar',     # Dhoop Ki Deewar
    31373: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Bou Diaries',        # Bu Olaiwy Diaries
    31718: '/var/www/html/TV_Series/TV_Web_Series-N-S/Supergirl',              # Super Girl
    31720: '/var/www/html/TV_Series/TV_Web_Series-N-S/Surreal Estate',         # SurrealEstate
    31670: '/var/www/html/TV_Series/TV_Web_Series-N-S/Shobdo Jobdo',           # Once Upon a Crime
    31294: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Alice in Borderland', # Alicein Borderland
    32265: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/22April',            # August14 2020
    31422: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Complete Season 01', # Project Thouser
    31443: '/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crisis on Infinite Earths', # Crisis Aftermath
}

for sid, disk_path in fix_map.items():
    if not os.path.isdir(disk_path):
        print(f"  [{sid}] -> {disk_path}: DIR NOT FOUND, skipping")
        continue
    seasons = scan_season_dir(disk_path)
    if not seasons:
        # Maybe flat structure - use series dir itself
        first_season = {
            "id": "auto-season-1",
            "title": "S1",
            "number": 1,
            "sourcePath": disk_path,
            "episodes": []
        }
        for fn in sorted(os.listdir(disk_path)):
            fpath = os.path.join(disk_path, fn)
            if os.path.isfile(fpath) and re.search(r'\.(mkv|mp4|avi|mov|wmv|webm)$', fn, re.I):
                fpath_url = fpath.replace('/var/www/html', '')
                fpath_url_enc = '/' + '/'.join(quote(p) for p in fpath_url.split(os.sep) if p)
                first_season["episodes"].append({
                    "id": f"auto-1-{len(first_season['episodes'])+1}",
                    "number": len(first_season['episodes'])+1,
                    "title": f"Episode {len(first_season['episodes'])+1}",
                    "sourcePath": fpath,
                    "videoUrl": fpath_url_enc,
                    "still": "", "description": "", "airDate": "",
                    "runtime": 0, "duration": "", "subtitleUrl": "",
                    "runtimeMinutes": 0, "durationSeconds": 0
                })
        seasons = [first_season]
    
    if seasons:
        new_seasons_json = json.dumps(seasons, ensure_ascii=False).replace("'", "''")
        psql(f"UPDATE content_catalog SET payload = jsonb_set(payload, '{{seasons}}', '{new_seasons_json}'::jsonb) WHERE id = {sid};")
        ep_count = sum(len(s.get('episodes',[])) for s in seasons)
        print(f"  [{sid}] Fixed -> {os.path.basename(disk_path)} ({ep_count} eps)")

# ================================================================
# STEP 2: Publish draft entries that have correct disk data
# ================================================================
print("\n=== STEP 2: Publish draft series ===")
draft_ids = [31340, 31406, 31442, 31492, 31501, 31519, 31705, 32627, 32667, 31524, 31493]
for sid in draft_ids:
    rows = psql(f"SELECT payload->>'title' FROM content_catalog WHERE id={sid} AND status='draft';")
    if not rows: continue
    title = rows[0]
    psql(f"UPDATE content_catalog SET status='published' WHERE id={sid};")
    print(f"  [{sid}] {title} -> published")

# ================================================================
# STEP 3: Add truly missing series (simple payloads)
# ================================================================
print("\n=== STEP 3: Add truly missing series ===")
missing_series = [
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
    ("Bou Diaries", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Bou Diaries"),
    ("Candy", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Candy"),
    ("Crisis on Infinite Earths", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crisis on Infinite Earths"),
    ("Dhoopki Deewar", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Dhoopki Deewar"),
    ("Duranga", "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Duranga"),
    ("Game of Thrones", "/var/www/html/Requested/Series/Game of thrones"),
    ("House of the Dragon", "/var/www/html/Requested/Series/House of the Dragon"),
    ("Kohrra", "/var/www/html/Requested/Series/Kohrra"),
    ("Mouse", "/var/www/html/Requested/Series/Mouse"),
    ("Parasyte: The Maxim", "/var/www/html/TV_Series/TV_Web_Series-N-S/Parasyte: The Maxim"),
    ("Pritam and Pedro", "/var/www/html/Requested/Series/Pritam and Pedro"),
    ("Rangbaaz (2018)", "/var/www/html/TV_Series/TV_Web_Series-N-S/Rangbaaz (2018)"),
    ("Secrets of Sinauli", "/var/www/html/TV_Series/TV_Web_Series-N-S/Secrets of Sinauli"),
    ("Shobdo Jobdo", "/var/www/html/TV_Series/TV_Web_Series-N-S/Shobdo Jobdo"),
    ("Shogun", "/var/www/html/TV_Series/TV_Web_Series-N-S/Shogun"),
    ("Super Dragon Ball Heroes", "/var/www/html/TV_Series/TV_Web_Series-N-S/Super Dragon Ball Heroes"),
    ("Tale of the Nine-Tailed", "/var/www/html/TV_Series/TV_Web_Series-T/Tale of the Nine-Tailed"),
    ("Teen Bindu", "/var/www/html/TV_Series/TV_Web_Series-T/Teen Bindu"),
    ("Vikings", "/var/www/html/Requested/Series/Vikings"),
    ("Vikings (Complete)", "/var/www/html/Requested/Series/Vikings (Complete)"),
]

next_id = get_next_id()
for title, disk_path in missing_series:
    if not os.path.isdir(disk_path):
        print(f"  SKIP: {title} -> {disk_path} not found")
        continue
    
    seasons = scan_season_dir(disk_path)
    if not seasons:
        # Flat structure - attempt to add files directly
        first_season = {
            "id": "auto-season-1",
            "title": "S1",
            "number": 1,
            "sourcePath": disk_path,
            "episodes": []
        }
        for fn in sorted(os.listdir(disk_path)):
            fpath = os.path.join(disk_path, fn)
            if os.path.isfile(fpath) and re.search(r'\.(mkv|mp4|avi|mov|wmv|webm)$', fn, re.I):
                fpath_url = fpath.replace('/var/www/html', '')
                fpath_url_enc = '/' + '/'.join(quote(p) for p in fpath_url.split(os.sep) if p)
                first_season["episodes"].append({
                    "id": f"auto-1-{len(first_season['episodes'])+1}",
                    "number": len(first_season['episodes'])+1,
                    "title": f"Episode {len(first_season['episodes'])+1}",
                    "sourcePath": fpath,
                    "videoUrl": fpath_url_enc,
                    "still": "", "description": "", "airDate": "",
                    "runtime": 0, "duration": "", "subtitleUrl": "",
                    "runtimeMinutes": 0, "durationSeconds": 0
                })
        seasons = [first_season]
    
    if not seasons or sum(len(s.get('episodes',[])) for s in seasons) == 0:
        print(f"  SKIP: {title} -> no video files found")
        continue
    
    ep_count = sum(len(s.get('episodes',[])) for s in seasons)
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    payload = make_payload(title, seasons, disk_path)
    payload_json = json.dumps(payload, ensure_ascii=False).replace("'", "''")
    
    psql(f"INSERT INTO content_catalog (id, slug, content_type, status, payload) VALUES ({next_id}, '{slug}', 'series', 'published', '{payload_json}'::jsonb);")
    print(f"  [{next_id}] {title} -> added ({ep_count} eps)")
    next_id += 1

print("\nDone!")
