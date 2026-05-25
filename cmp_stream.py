import json, sys
a = json.load(open('/tmp/stream-3427.json'))
b = json.load(open('/tmp/stream-5195.json'))
print('=== 3427 ===')
print(json.dumps(a, indent=2))
print('\n=== 5195 ===')
print(json.dumps(b, indent=2))
print('\n=== DIFF ===')
for k in sorted(set(list(a.keys()) + list(b.keys()))):
    va = a.get(k)
    vb = b.get(k)
    if va != vb:
        print(f'DIFF {k}:')
        print(f'  3427: {va!r}')
        print(f'  5195: {vb!r}')
