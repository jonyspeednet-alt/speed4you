#!/usr/bin/env python3
"""
Fix all series episode sourcePath/videoUrl to match actual files on disk.
Usage: source /home/speed4you/portal-app/backend/.env && python3 /tmp/fix_all_episode_paths.py
"""
import json, os, re, subprocess, sys
from urllib.parse import quote

# Load .env from backend dir or current dir
_env_file = None
for _d in ['/home/speed4you/portal-app/backend', '.']:
    _p = os.path.join(_d, '.env')
    if os.path.isfile(_p): _env_file = _p; break
if _env_file:
    with open(_env_file) as _f:
        for _l in _f:
            _l = _l.strip()
            if _l and not _l.startswith('#') and '=' in _l:
                _k, _v = _l.split('=', 1)
                os.environ.setdefault(_k, _v)

def psql(query):
    """Run a query via psql with environment variable. For large queries, use a temp file."""
    env = os.environ.copy(); env['PGPASSWORD'] = os.environ.get('DB_PASSWORD','postgres')
    conn = ['psql', '-h', os.environ.get('DB_HOST','localhost'), '-p', os.environ.get('DB_PORT','5432'),
            '-U', os.environ.get('DB_USER','postgres'), '-d', os.environ.get('DB_NAME','isp_entertainment'),
            '-t', '-A']
    # If query is large, write to temp file to avoid "Argument list too long"
    if len(query) > 100000:
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
            fname = f.name; f.write(query)
        cmd = conn + ['-f', fname]
        r = subprocess.run(cmd, capture_output=True, text=True, env=env)
        os.unlink(fname)
    else:
        cmd = conn + ['-c', query]
        r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        err = r.stderr.strip()
        if err: print(f"psql err: {err[:200]}", file=sys.stderr)
        return []
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]

def find_series_dir(source_path):
    """Walk up from a sourcePath to find the series root directory (parent of season dirs)."""
    p = source_path
    while p and not os.path.isdir(p):
        pp = os.path.dirname(p)
        if pp == p: return None
        p = pp
    if not p or not os.path.isdir(p): return None
    # If p itself has no season subdirs, go up one level
    has_season_subdir = any(re.match(r'[Ss]eason\s*\d+|S\d+', e) for e in os.listdir(p) if os.path.isdir(os.path.join(p, e)))
    if has_season_subdir: return p
    # Try parent
    parent = os.path.dirname(p)
    if parent and os.path.isdir(parent):
        return parent
    return p

def map_season_dirs(series_dir):
    """Map season directories to season numbers, handling various naming patterns."""
    sdirs = {}
    for entry in os.listdir(series_dir):
        epath = os.path.join(series_dir, entry)
        if not os.path.isdir(epath): continue
        # Match: "Season 01", "Season 01 (2017)", "S01", "Season 1", etc.
        m = re.match(r'[Ss]eason\s*(\d+)', entry)
        if not m: m = re.match(r'[Ss](\d+)\b', entry)
        if not m: continue
        sn = int(m.group(1))
        sdirs[sn] = epath
    return sdirs

def find_episode_files(season_dir):
    """Find video files in a season directory and extract episode numbers."""
    files = []
    for f in os.listdir(season_dir):
        fpath = os.path.join(season_dir, f)
        if not os.path.isfile(fpath): continue
        if not re.search(r'\.(mkv|mp4|avi|mov|wmv|webm)$', f, re.I): continue
        # Extract episode number: E01, E001, Episode 1, etc.
        em = re.search(r'[Ee]p?(?:isode)?\s*0*(\d+)', f)
        fn = int(em.group(1)) if em else None
        files.append((fpath, fn, f))
    return sorted(files, key=lambda x: x[2])  # sort by filename

def build_video_url(abs_path):
    m = re.match(r'/var/www/html(.+)', abs_path.replace('\\', '/'))
    if not m: return None
    parts = m.group(1).split('/')
    return '/' + '/'.join(quote(p) for p in parts if p)

def fix_series(sid, payload):
    seasons = payload.get('seasons', [])
    if not seasons: return 0
    
    source_path = seasons[0].get('sourcePath', '')
    series_dir = find_series_dir(source_path)
    if not series_dir: return 0
    
    sdirs = map_season_dirs(series_dir)
    if not sdirs:
        print(f"  [{sid}] {payload.get('title','?')}: No season dirs found at {series_dir}")
        return 0
    
    fixed = 0
    for si, season in enumerate(seasons):
        sn = season.get('number', si + 1)
        sdir = sdirs.get(sn)
        if not sdir: continue
        
        disk_eps = find_episode_files(sdir)
        episodes = season.get('episodes', [])
        
        for ei, ep in enumerate(episodes):
            en = ep.get('number', ei + 1)
            old_path = ep.get('sourcePath', '')
            if old_path and os.path.isfile(old_path): continue
            
            # Find by explicit episode number first
            new_path = None
            for fp, fep, fn in disk_eps:
                if fep == en: new_path = fp; break
            # Fallback: positional match
            if not new_path and ei < len(disk_eps):
                new_path = disk_eps[ei][0]
            if not new_path: continue
            
            vu = build_video_url(new_path)
            payload['seasons'][si]['episodes'][ei]['sourcePath'] = new_path
            if vu: payload['seasons'][si]['episodes'][ei]['videoUrl'] = vu
            fixed += 1
    
    if fixed > 0:
        payload_json = json.dumps(payload, ensure_ascii=False).replace("'", "''")
        psql(f"UPDATE content_catalog SET payload = '{payload_json}'::jsonb WHERE id = {sid};")
    return fixed

def main():
    total = psql("SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='published';")
    print(f"Published series: {total[0] if total else '?'}")
    
    rows = psql("SELECT id, payload FROM content_catalog WHERE content_type='series' AND status='published' ORDER BY id;")
    print(f"Fetched {len(rows)} series")
    
    all_fixed = 0
    for row in rows:
        try:
            sid_str = row.split('|', 1)[0]
            payload_str = row[len(sid_str)+1:]
            sid = int(sid_str)
            payload = json.loads(payload_str)
        except: continue
        n = fix_series(sid, payload)
        if n:
            print(f"  [{sid}] {payload.get('title','?')}: {n} fixed")
            all_fixed += n
    
    print(f"\nTotal episodes fixed: {all_fixed}")

if __name__ == '__main__':
    main()
