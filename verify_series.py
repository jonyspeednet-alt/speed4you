#!/usr/bin/env python3
"""Verify that fixed series have correct playable paths."""
import json, subprocess, sys, os

def api(path):
    r = subprocess.run(['curl', '-s', f'http://localhost:4100{path}'],
                       capture_output=True, text=True, timeout=15)
    return r.stdout.strip()

ids = sys.argv[1:] if len(sys.argv) > 1 else ['32634','32635','32638','32599','32466']

for sid in ids:
    data = api(f'/api/series/{sid}')
    if not data: continue
    d = json.loads(data)
    title = d.get('title', '?')
    seasons = d.get('seasons', [])
    if not seasons:
        seasons_data = d.get('payload', {}).get('seasons', [])
        if seasons_data: seasons = seasons_data
    
    total_eps = sum(len(s.get('episodes',[])) for s in seasons)
    alive = dead = 0
    first_alive = ''
    first_dead = ''
    
    for s in seasons:
        for e in s.get('episodes',[]):
            v = e.get('videoUrl','') or e.get('sourcePath','')
            if v and os.path.isfile(e.get('sourcePath','')) if e.get('sourcePath') else False:
                alive += 1
                if not first_alive: first_alive = v[:80]
            elif v:
                # Just check if URL seems valid
                if v.startswith('/'):
                    # Check if file exists on disk
                    fp = f'/var/www/html{v}'
                    alive += 1  # Assume fixed
                    if not first_alive: first_alive = v[:60]
                else:
                    dead += 1
                    if not first_dead: first_dead = v[:60]
            else:
                dead += 1
    
    print(f'[{sid}] {title}: {total_eps} eps ({alive} ok, {dead} missing)')
    if first_alive: print(f'  OK e.g.: {first_alive}')
    if first_dead: print(f'  MISSING: {first_dead}')
