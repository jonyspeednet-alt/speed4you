with open('/etc/nginx/sites-enabled/data.speed4you.net', 'r') as f:
    content = f.read()

old = '    return 301 https://' + '$host' + '$request_uri;'
new = '''    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://''' + '$host' + '$request_uri' + ''';
    }'''

if old in content:
    content = content.replace(old, new, 1)
    with open('/tmp/nginx-fixed.conf', 'w') as f:
        f.write(content)
    print('patched')
else:
    print('pattern not found')
