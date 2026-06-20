#!/bin/bash
MP4FILE=$(find "/var/www/html/TV_Series/TV_Web_Series-0-9_A-E/Crashh/" -name "*S01E01*.mp4" -type f | head -1)

echo "=== File info ==="
ls -lh "$MP4FILE"

echo ""
echo "=== ffprobe streams ==="
ffprobe -v error -show_streams -show_format "$MP4FILE" 2>&1

echo ""
echo "=== Check moov atom position ==="
python3 -c "
with open('$MP4FILE', 'rb') as f:
    data = f.read(65536)
    moov_pos = data.find(b'moov')
    ftyp_pos = data.find(b'ftyp')
    print(f'ftyp at: {ftyp_pos}')
    print(f'moov at: {moov_pos}')
    if moov_pos < 65536 and moov_pos >= 0:
        print('moov atom is in first 64KB (faststart OK)')
    else:
        print('moov atom NOT in first 64KB (faststart might have failed)')
"
