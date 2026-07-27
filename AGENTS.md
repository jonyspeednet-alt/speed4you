# Speed4You Portal — Project Overview

## Stack
- **Frontend**: React 18 + Vite 4 + React Router 6 + TanStack React Query 5
- **Backend**: Node.js + Express 4
- **Database**: PostgreSQL (primary) / pg-mem in-memory (dev fallback)
- **Deploy**: GitHub Actions → self-hosted runner → SSH + systemd

## Project Structure
```
speed4you/
├── frontend/          # React SPA
│   └── src/
│       ├── pages/     # Route pages (HomePage, BrowsePage, etc.)
│       ├── services/  # API client + content service
│       └── components/
├── backend/           # Express API
│   └── src/
│       ├── routes/    # API route handlers
│       ├── data/store/ # Database queries + seed data
│       ├── config/    # Database, env-check
│       └── middleware/ # Auth, rate-limit, caching
├── .github/workflows/ # CI/CD pipelines
├── opencode.json      # opencode AI config
└── AGENTS.md          # This file
```

## Key Files

| Purpose | Path |
|---------|------|
| Backend entry | `backend/src/index.js` |
| Content routes | `backend/src/routes/content.js` |
| Database queries | `backend/src/data/store/content.js` |
| DB init + seed | `backend/src/data/store/base.js` |
| Seed data | `backend/src/data/store/constants.js` |
| Homepage component | `frontend/src/pages/HomePage.jsx` |
| Content service | `frontend/src/services/contentService.js` |
| API client | `frontend/src/services/apiClient.js` |
| Env template | `.env.example` |
| Deploy workflow | `.github/workflows/deploy.yml` |

## Server Access
- **Host**: GitHub Secret `DEPLOY_HOST`
- **User**: GitHub Secret `DEPLOY_USER`
- **Port**: GitHub Secret `DEPLOY_PORT`
- **SSH Key**: GitHub Secret `DEPLOY_SSH_KEY`
- **Backend dir**: `/home/speed4you/portal-app/backend`
- **Frontend dir**: `/var/www/speed4you.net/`
- **Service**: `isp-portal.service` (systemd)

## Database
- **Host**: GitHub Secret `DB_HOST`
- **Port**: GitHub Secret `DB_PORT` (5432)
- **Name**: GitHub Secret `DB_NAME` (isp_entertainment)
- **User**: GitHub Secret `DB_USER`
- **Password**: GitHub Secret `DB_PASSWORD`
- **Pool max**: GitHub Secret `DB_POOL_MAX` (50)

## Available Commands (via opencode.json)
- `deploy` — Push to main triggers auto-deploy
- `ssh` — SSH into production server
- `db-query <SQL>` — Run SQL query
- `db-psql` — Open interactive psql
- `logs` — View backend logs
- `restart` — Restart backend service
- `health` — Check backend health
- `server-ls <path>` — List files on server
- `server-cat <path>` — View file on server
- `server-disk` — Check server disk usage
- `server-find <args>` — Find files on server
- `search-content <keyword>` — Search content on the site (via public API)
- `content-detail <id>` — Get content details by ID (via public API)

## Post-Scan Features
- **Auto-fix missing posters**: Every scan automatically retries metadata enrichment for items with missing poster/backdrop/description (up to 20 items per scan)
- **Scan summary stored**: Last scan result stored in `app_state` key `last_scan_summary`
- **Webhook endpoint**: `POST /portal-api/api/webhook/scan` with header `x-webhook-secret` to trigger a scan remotely

## Webhook
- **Secret**: `72e92581146914e2e57744787297f460d2f61c75eaa85619c2715cf1735b9576`
- **Endpoint**: `POST /portal-api/api/webhook/scan` (header `x-webhook-secret`)
- 🔄 Webhook secret is auto-rotated by deploy workflow — re-check `.env` if it fails

## Deployment
- Auto-deploys on push to `main` via GitHub Actions
- Workflow: `.github/workflows/deploy.yml`
- Runs on self-hosted runner on the server
- Post-deploy: cleanup season duplicates → rematch metadata → fix missing posters

## Known Issues (already fixed)
- Homepage 500 on weekends (lateNight/weekendBinge index mismatch) — **FIXED**
- getHomepage ignoring limit param — **FIXED**
- Admin API public caching — **FIXED**
- allocateNextCatalogId race condition — **FIXED**
- View count abuse (no dedup) — **FIXED**
- API root mount conflicting with SPA routes — **FIXED**
- Seed series seasons format — **FIXED**
- Dead code (fetchHomepage duplicate) — **REMOVED**
- secret-scanning workflow — **DISABLED** (manual only)
- Scanner season grouping: `stripSeasonSuffix` + `groupSiblingSeasonFolders` in `scanner.js` `processSeriesRoot` — **DONE**
- Missing poster auto-fix: metadata enricher noise patterns updated — **DONE**
- Draft/undefined content blocking: status check added to `/series`, `/movies`, `/player` routes — **DONE**
- Orphan items (no slug/root_id) set to `draft` on 2026-07-27 — **DONE**

## Special Notes
- Scanner auto-discovers directories under `/var/www/html/` with IDs prefixed `auto-`. These can override manually created roots with the same ID. Use unique non-`auto-` prefix IDs for manual roots.
- Webhook secret checked from `.env`; may rotate on deploy — always re-read before use.
