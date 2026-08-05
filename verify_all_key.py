#!/usr/bin/env python3
import json, subprocess, os

ids = [32634, 32635, 32636, 32637, 32638, 32690, 32599, 32466, 32693, 32859]
for sid in ids:
    r = subprocess.run(['curl', '-s', f'http://localhost:4100/api/series/{sid}'], capture_output=True, text=True, timeout=15)
    d = json.loads(r.stdout.strip())
    seasons = d.get('seasons', [])
    if not seasons: seasons = d.get('payload', {}).get('seasons', [])
    total = sum(len(s.get('episodes',[])) for s in seasons)
    
    # Check first episode of first season
    first_ep = seasons[0]['episodes'][0] if seasons and seasons[0].get('episodes') else {}
    src = first_ep.get('sourcePath', '')
    exists = os.path.isfile(src) if src else False
    vu = first_ep.get('videoUrl', '')
    
    print(f'[{sid}] {d.get("title","?")}: {total} eps | S1E1: {"OK" if exists else "MISSING"} | {vu[:80] if vu else "N/A"}')
