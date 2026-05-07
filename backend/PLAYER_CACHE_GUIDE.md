## Player cache standard

### Purpose
- `portal-media-cache` optimized MP4 cache store.
- Non-direct playable media first request e transcode/remux hoy, tarpor cache theke serve hoy.
- Cache path runtime, prewarm, optimize, audit, ar maintenance scripts er moddhe ekoi shared config use kore.

### Standard environment variables
- `PLAYER_CACHE_ROOT`: production e recommended `/var/www/html/Extra_Storage/portal-media-cache`
- `PLAYER_CACHE_READY_MIN_BYTES`: ready cache detect korar minimum file size, default `1048576`
- `FFMPEG_PATH`: optional, default `ffmpeg`
- `FFPROBE_PATH`: optional, default `ffprobe`
- `PLAYER_TRANSCODE_PRESET`: default `veryfast`
- `PLAYER_TRANSCODE_CRF`: default `23`
- `PLAYER_AUDIO_BITRATE`: default `160k`

### Useful commands
- `npm run media:audit-player`
- `npm run media:optimize-cache`
- `npm run media:prewarm-player`
- `npm run media:cache-report`
- `npm run media:cache-maintain`

### Maintenance examples
```bash
node scripts/manage-player-cache.js --report
node scripts/manage-player-cache.js --report --remove-stale-partials --partial-hours 12
node scripts/manage-player-cache.js --report --delete-older-than-days 30 --dry-run
```

### Notes
- Production deploy docs and scripts should point to the same cache root.
- `server-deploy` package is generated from `backend`, so source-of-truth holo `backend/`.
