import json, subprocess
for sid in [32634,32635,32636,32637,32638,32690]:
    r = subprocess.run(['curl','-s',f'http://localhost:4100/api/series/{sid}'],capture_output=True,text=True,timeout=10)
    d = json.loads(r.stdout.strip())
    s1e1 = d['seasons'][0]['episodes'][0]
    print(f'[{sid}] {d["title"]}')
    print(f'  sourcePath: {s1e1["sourcePath"][:80]}')
    print(f'  file exists: {__import__("os").path.isfile(s1e1["sourcePath"])}')
