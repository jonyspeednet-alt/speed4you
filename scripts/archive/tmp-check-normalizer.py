import subprocess, json, os
r = subprocess.run(['psql', '-U', os.environ.get('DB_USER', 'postgres'), '-d', 'isp_portal', '-c', "SELECT value FROM app_state WHERE key='media_normalizer_state'"], capture_output=True, text=True, env={'PGPASSWORD': os.environ.get('DB_PASSWORD', 'postgres')})
lines = [l for l in r.stdout.split('\n') if l.strip() and not l.startswith('-') and not l.startswith('(') and 'value' not in l.lower()]
if lines:
    data = json.loads(lines[1].strip())
    print('Status:', data.get('status'))
    print('Current:', data.get('currentFile'))
    print('Progress:', data.get('progress'), '%')
    print('Converted:', len(data.get('processed', {})))
    print('Failed:', len(data.get('failed', {})))
    print('---last log---')
    with open('/tmp/normalizer.log') as f:
        print(f.readlines()[-3:])
