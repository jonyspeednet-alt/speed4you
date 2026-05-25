cat /home/speed4you/portal-app/backend/src/data/app_state.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'pipeline' in k.lower() or 'scanner' in k.lower() or 'queue' in k.lower():
        print(k, '=', json.dumps(v, indent=2)[:500])
"