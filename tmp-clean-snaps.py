import subprocess
import re

# Run snap list --all
result = subprocess.run(['snap', 'list', '--all'], capture_output=True, text=True)
lines = result.stdout.strip().split('\n')[1:]  # skip header

removed = 0
for line in lines:
    parts = line.split()
    if len(parts) >= 4:
        name = parts[0]
        rev = parts[2]
        notes = ' '.join(parts[4:])
        if 'disabled' in notes:
            subprocess.run(['sudo', 'snap', 'remove', '--revision', rev, name], capture_output=True)
            removed += 1

print(f'Removed {removed} disabled snap revisions')
