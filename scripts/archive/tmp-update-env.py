import re
with open('/home/speed4you/portal-app/backend/.env', 'r') as f:
    content = f.read()
with open('/tmp/new-hash.txt', 'r') as f:
    hash_val = f.read().strip()
content = re.sub(r'ADMIN_PASSWORD_HASH=.*', f'ADMIN_PASSWORD_HASH={hash_val}', content)
with open('/home/speed4you/portal-app/backend/.env', 'w') as f:
    f.write(content)
print('Updated:', hash_val[:20] + '...')
