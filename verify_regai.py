#!/usr/bin/env python3
import json, subprocess
r = subprocess.run(['curl', '-s', 'http://localhost:4100/api/series/32690'], capture_output=True, text=True, timeout=15)
d = json.loads(r.stdout.strip())
print(f'Title: {d.get("title")}')
for s in d.get('seasons', []):
    eps = s.get('episodes', [])
    print(f'  S{s.get("number","?")}: {len(eps)} eps')
    for e in eps[:2]:
        print(f'    E{e.get("number")}: {e.get("sourcePath","")[:90]}')
