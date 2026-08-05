#!/usr/bin/env python3
"""Fix Regai (32690) payload to match actual disk files."""
import json, os, subprocess, sys
from urllib.parse import quote

REGA_DIR = '/var/www/html/Requested/Series/Regai'

# Build correct seasons
files = sorted([f for f in os.listdir(REGA_DIR) if f.endswith('.mkv')])
eps = []
for i, fn in enumerate(files, 1):
    fpath = os.path.join(REGA_DIR, fn)
    fpath_url = fpath.replace('/var/www/html', '')
    fpath_url_enc = '/' + '/'.join(quote(p) for p in fpath_url.split(os.sep) if p)
    eps.append({
        "id": f"regai-1-{i}",
        "number": i,
        "title": f"Episode {i}",
        "sourcePath": fpath,
        "videoUrl": fpath_url_enc,
        "still": "",
        "description": "",
        "airDate": "",
        "runtime": 0,
        "duration": "",
        "subtitleUrl": "",
        "runtimeMinutes": 0,
        "durationSeconds": 0
    })

new_seasons = [{
    "id": "regai-season-1",
    "title": "S1",
    "number": 1,
    "sourcePath": REGA_DIR,
    "episodes": eps
}]

# Get current payload for Regai
env = os.environ.copy()
env['PGPASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
cmd = ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment',
       '-t', '-A', '-c', "SELECT payload FROM content_catalog WHERE id=32690;"]
r = subprocess.run(cmd, capture_output=True, text=True, env=env)
if r.returncode != 0:
    print(f"psql error: {r.stderr}")
    sys.exit(1)

payload = json.loads(r.stdout.strip())
payload['seasons'] = new_seasons

# Also fix any other top-level fields that point to Vikings
# Update source if it points to wrong place
if 'source' in payload and 'Vikings' in str(payload.get('source', '')):
    payload['source'] = REGA_DIR

# Update the DB
new_json = json.dumps(payload, ensure_ascii=False)
from tempfile import NamedTemporaryFile
with NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
    fname = f.name
    f.write(f"UPDATE content_catalog SET payload = '{new_json.replace(chr(39), chr(39)+chr(39))}'::jsonb WHERE id = 32690;\n")

cmd2 = ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'isp_entertainment', '-f', fname]
r2 = subprocess.run(cmd2, capture_output=True, text=True, env=env)
os.unlink(fname)

if r2.returncode == 0:
    print(f"Regai (32690) fixed: {len(eps)} episodes in 1 season")
else:
    print(f"Error: {r2.stderr}")
