import json, subprocess
r = subprocess.run(['curl', '-s', 'http://localhost:4100/api/webhook/last-scan'], capture_output=True, text=True, timeout=10)
d = json.loads(r.stdout.strip())
s = d.get('summary', {})
print(f"Updated: {s.get('updated',0)}, Posters fixed: {s.get('missingPostersFixed',0)}, Errors: {s.get('errors',0)}")
print(f"Completed: {s.get('completedAt','?')}")
