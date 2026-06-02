import re
with open('/home/speed4you/portal-app/backend/.env', 'r') as f:
    content = f.read()
content = re.sub(
    r'CORS_ALLOWED_ORIGINS=.*',
    'CORS_ALLOWED_ORIGINS=https://data.speed4you.net,https://103.79.182.226',
    content
)
with open('/home/speed4you/portal-app/backend/.env', 'w') as f:
    f.write(content)
print('CORS updated')
