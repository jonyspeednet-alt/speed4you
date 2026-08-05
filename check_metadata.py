import json, subprocess
ids = [33375, 33376, 33387, 33383, 33367, 33362, 33363, 33365, 33366]
for sid in ids:
    r = subprocess.run(['curl', '-s', f'http://localhost:4100/api/series/{sid}'], capture_output=True, text=True, timeout=10)
    d = json.loads(r.stdout.strip())
    poster = d.get('poster', 'N/A')
    genres = d.get('genres', d.get('genre', 'N/A'))
    year = d.get('year', 'N/A')
    desc = d.get('description', d.get('overview', ''))[:60] if (d.get('description') or d.get('overview')) else 'N/A'
    has_poster = poster.startswith('http') if poster and poster != 'N/A' else False
    print(f'[{sid}] {d.get("title","?")}: poster={"OK" if has_poster else "N/A"} genre={genres[:30] if genres and genres!="N/A" else "N/A"} year={year}')
