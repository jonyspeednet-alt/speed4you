#!/usr/bin/env python3
import subprocess, json, os
for sid in [33375, 33376, 33387, 33383, 33367]:
    r = subprocess.run(['curl', '-s', f'http://localhost:4100/api/series/{sid}'], capture_output=True, text=True, timeout=15)
    d = json.loads(r.stdout.strip()) if r.stdout.strip() else {}
    if not d: print(f'[{sid}] NOT FOUND'); continue
    s = d.get('seasons', [])
    if not s: print(f'[{sid}] {d.get("title","?")}: no seasons'); continue
    e = s[0].get('episodes',[])
    fp = e[0].get('sourcePath','') if e else ''
    exists = os.path.isfile(fp) if fp else False
    print(f'[{sid}] {d.get("title","?")}: {len(e)} eps S1E1, file exists={exists}')
