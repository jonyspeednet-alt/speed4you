import re
with open('/home/speed4you/portal-app/backend/.env', 'r') as f:
    content = f.read()
content = re.sub(
    r'ADMIN_PASSWORD_HASH=.*',
    'ADMIN_PASSWORD_HASH=***REMOVED***',
    content
)
with open('/home/speed4you/portal-app/backend/.env', 'w') as f:
    f.write(content)
print('Password updated to: ***REMOVED***')
