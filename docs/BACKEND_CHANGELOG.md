# Backend Upgrade & Changelog — Speed4You

This document consolidates all historical upgrades, security patches, and feature additions for the Speed4You backend service.

---

## v1.1.2 (June 2026) — Bengali Discovery & URL Encoding Fixes

### Fixes & Enhancements
- **Bengali Media Path Correction**: Resolved 404 streaming/playback issues by pointing scanner root `extra-storage-bangla-movies` to `/var/www/html/Bangla_Movies/` (replacing incorrect `/var/www/html/Extra_Storage/...` paths).
- **Scanner Worker Reliability**:
  - Fixed a worker loop `ReferenceError` where `folderName` was undefined when handling nested directories.
  - Enabled worker standard I/O inheritance (`stdio: ['ignore', 'inherit', 'inherit', 'ipc']`) to ensure scanner worker crashes are captured in system-level logs.
- **Double URL Encoding Fix**: Resolved media file playback errors where special characters and spaces in files were encoded twice during catalog entry insertion.
- **Metadata Rematch Endpoint**: Implemented and documented a new endpoint to allow admins to retry matching/enriching content that previously skipped, failed, or was not found on TMDB:
  - `POST /api/admin/metadata/rematch`
- **Data Cleanup**: Pruned duplicate rows and cleared stale metadata flags, bringing the Bengali movies library to 666 unique and published entries.

---

## v1.1.0 (April 2026) — Security & Performance Upgrade

### Dependency Updates

| Package | Previous Version | Upgraded Version | Status |
|---|---|---|---|
| `express` | `4.18.2` | `4.22.1` | Upgraded |
| `helmet` | `7.1.0` | `8.1.0` | Upgraded |
| `joi` | `17.11.0` | `18.1.2` | Upgraded |
| `jsonwebtoken` | `9.0.2` | `9.0.3` | Upgraded |
| `dotenv` | `16.3.1` | `17.4.2` | Upgraded |
| `multer` | `1.4.5` | `2.1.1` | Upgraded |
| `nodemon` | `3.0.2` | `3.1.14` | Upgraded (dev) |

### Key Features Added

1. **Security Headers (Helmet v8.1.0)**:
   - Added Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and clickjacking/MIME-sniffing protections.
2. **Joi Schema Validation**:
   - Implemented request body and query validation for admin content management, returns structured `400 Bad Request` responses on failure instead of internal server errors.
3. **API Rate Limiting**:
   - Added `express-rate-limit` configurations to prevent abuse:
     - Global API: Max 5,000 requests per 15 minutes.
     - Public Content List: Max 20,000 requests per minute.
     - Auth Login: Max 10 attempts per 15 minutes.
4. **Database Connection Pooling**:
   - Switched to `pg.Pool` to reuse database connections, improving query execution times by 3-5x under concurrent loads.
5. **System Metrics & Monitoring**:
   - Integrated health endpoints `/health` and `/health/scanner` for uptime, memory usage, and scanner root health status checking.
6. **Response Optimization**:
   - Added gzip/brotli response compression and long-lived static cache headers for static portal assets.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | `development` or `production` |
| `PORT` | Yes | `3001` | Server port |
| `JWT_SECRET` | Yes | — | Secret key for signing JWTs (must be 32+ characters) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `CORS_ALLOWED_ORIGINS` | Yes | — | Comma-separated allowed origin list |
| `GLOBAL_API_RATE_LIMIT_MAX` | No | `5000` | Max requests per 15 minutes globally |
| `PUBLIC_API_RATE_LIMIT_MAX` | No | `20000` | Max requests per 1 minute for public APIs |

---

## Verification & Rollback

### Running Tests
```bash
cd backend
npm test
```

### Rollback Strategy
If a deployment fails:
```bash
# Revert to last commit
git reset --hard HEAD~1

# Restore node_modules backup
cp package-lock.json.backup package-lock.json
npm install
```
