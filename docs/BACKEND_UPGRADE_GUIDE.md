# Backend Upgrade Guide - ISP Entertainment Portal

> Last updated: May 2026

## Current Backend Status

**Version**: v1.1.0
**Node.js**: 22.x (Latest LTS)
**Main Server**: Express.js 4.22.1 (already upgraded from 4.18.2)
**Database**: PostgreSQL (pg 8.11.3)

### Completed Upgrades

The following dependency upgrades have been applied:

| Package | Previous | Current | Status |
|---------|----------|---------|--------|
| express | 4.18.2 | 4.22.1 | Upgraded |
| pg | 8.11.3 | 8.11.3 | Latest |
| bcryptjs | 2.4.3 | 2.4.3 | Latest |
| cors | 2.8.5 | 2.8.5 | Latest |
| dotenv | 16.3.1 | 17.4.2 | Upgraded |
| helmet | 7.1.0 | 8.1.0 | Upgraded |
| joi | 17.11.0 | 18.1.2 | Upgraded |
| jsonwebtoken | 9.0.2 | 9.0.3 | Upgraded |
| morgan | 1.10.0 | 1.10.0 | Latest |
| multer | 1.4.5 | 2.1.1 | Upgraded (v2) |
| express-rate-limit | 8.4.0 | 8.4.0 | Latest |

### Already Implemented Features

These features from the original upgrade plan are now part of the codebase:

| Feature | Implementation | Location |
|---------|---------------|----------|
| Security headers (Helmet) | CSP, HSTS, frameguard | `src/index.js` |
| Input validation (Joi) | Schema validation for admin content | `src/middleware/validate.js` |
| Rate limiting | Global + public + login rate limits | `src/index.js` |
| CORS allowlist | Environment-based origin checking | `src/index.js` |
| Error handling | Structured error responses, no stack in production | `src/index.js` |
| Request logging | Morgan with dev/combined formats | `src/index.js` |
| Health check | `/health` and `/health/scanner` endpoints | `src/index.js` |
| Compression | Response compression middleware | `src/middleware/response-optimizer.js` |
| Static cache headers | Long-lived cache for hashed assets | `src/middleware/response-optimizer.js` |
| User resolution | Cookie + JWT + guest fallback | `src/middleware/resolve-user-id.js` |
| Admin auth | JWT verification with role check | `src/middleware/require-admin-auth.js` |

---

## Remaining Upgrade Tasks

### Phase 2: Code Cleanup (Not Started)

- [ ] Remove `tmp-list-roots.js` reference from workspace `package.json` (`main` field)
- [ ] Fix version mismatch in workspace root `package.json` (lists react ^19.2.6 but frontend uses ^18.3.1)
- [ ] Fix version mismatch in workspace root `package.json` (lists react-router-dom ^7.15.0 but frontend uses ^6.24.1)
- [ ] Remove dead `SearchPage.jsx` component (route redirects to `/browse`)
- [ ] Remove development seed data from production code path
- [ ] Add backend route for `/api/access` (frontend `AccessPage` has no backend endpoint)

### Phase 3: Performance Improvements (Partially Implemented)

- [x] Database connection pooling (pg Pool)
- [x] Scanner cache layer
- [x] Player media cache (configurable path)
- [ ] Add database query monitoring/logging
- [ ] Implement server-side response caching for frequent queries
- [ ] Add database migration runner (currently manual)
- [ ] Optimize homepage aggregation query (`/api/content/homepage`)

### Phase 4: Advanced Features (Not Started)

The features below are **aspirational** — they are NOT currently implemented. They represent potential future enhancements:

| Feature | Description | Complexity |
|---------|-------------|------------|
| Prometheus metrics | Request duration histograms, error counters | Medium |
| Response caching | Redis or in-memory cache for API responses | Medium |
| CSRF protection | Token-based CSRF for state-changing requests | Low |
| Docker containerization | Dockerfile + docker-compose for dev/prod | Medium |
| Subtitle support | Player currently returns `subtitles: []` | High |
| User registration | No user management, only auto-created cookie users | High |

---

## Environment Variables Reference

### Required in Production

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3001` |
| `JWT_SECRET` | JWT signing ***REMOVED*** (32+ chars) | `<YOUR_JWT_SECRET>` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://data.speed4you.net` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `TRUST_PROXY_HOPS` | `1` | Number of trusted proxy hops |
| `GLOBAL_API_RATE_LIMIT_MAX` | `5000` | Global API rate limit per 15 min |
| `PUBLIC_API_RATE_LIMIT_MAX` | `20000` | Public content rate limit per min |
| `REQUIRE_CORS_ALLOWLIST` | - | Force CORS allowlist in non-production |
| `SCANNER_HEALTH_PUBLIC_VERBOSE` | `false` | Show sensitive scanner health details |
| `ADMIN_UPLOAD_MAX_BYTES` | `1048576` | Max upload size for posters/banners (1 MB) |

### Media Normalizer

| Variable | Default | Description |
|----------|---------|-------------|
| `MEDIA_NORMALIZER_CRF` | `19` | Video quality CRF (lower = better) |
| `MEDIA_NORMALIZER_PRESET` | `medium` | Encoding preset |
| `MEDIA_NORMALIZER_MIN_FREE_GB` | `10` | Min free disk space in GB |
| `MEDIA_NORMALIZER_SCAN_INTERVAL_MS` | `15000` | Scan interval in ms |

---

## Testing

Run the backend test suite:

```bash
cd backend
npm test
```

Current test coverage includes:
- `validate.test.js` - Joi validation schemas
- `metadata-enricher.test.js` - TMDb metadata fetching
- `scanner-classification.test.js` - Media type classification
- `resolve-user-id.test.js` - User context middleware
- `require-admin-auth.test.js` - Admin auth middleware
- `player-strategy.test.js` - Streaming strategy selection
- `scanner-upgrade.test.js` - Scanner functionality

**Note:** 1 pre-existing test failure has been noted but not yet resolved.

---

## Rollback Plan

If something goes wrong after an upgrade:

```bash
# Restore previous state via git
git reset --hard HEAD~1

# Or restore node_modules from backup
cp backend/package-lock.json.backup backend/package-lock.json
cd backend && rm -rf node_modules && npm install
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -i :3001` then `kill -9 <PID>` |
| Database connection errors | Verify `DATABASE_URL` and test with `psql` |
| Module not found | `rm -rf node_modules && npm install` |
| CORS errors in production | Check `CORS_ALLOWED_ORIGINS` includes the requesting origin |
| 504 Gateway Timeout | Verify backend PORT matches nginx upstream configuration |
| JWT ***REMOVED*** error | Ensure `JWT_SECRET` is 32+ characters in production |
