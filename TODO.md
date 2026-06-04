# Master TODO — Speed4You

> Single source of truth for everything that needs doing. Every agent reads this
> at the start of a task and updates it as work progresses.
> See `AGENTS.md` §5 for the format and ownership rules.

## In progress  [~]
- *(no agent currently holds a task — pick one from "Ready to do" and mark it `[~]`)*


## Ready to do  [ ]

### Frontend
- [ ] (frontend) Virtualize the Bengali picks rail
- [ ] (frontend) Add skeleton state to the Continue Watching rail
- [ ] (frontend) Audit accessibility (axe) across all pages

### Backend
- [ ] (backend)  Move scanner roots config from file to admin API
- [ ] (backend)  Add retry on scanner transient failures
- [ ] (backend)  Add Prometheus /metrics endpoint for the backend

### Database
- [ ] (db)       Re-evaluate JSONB vs. typed columns for `payload` (performance review)
- [ ] (db)       Add migration for `metadata_status` index in `content_catalog`

### Docs
- [ ] (docs)     Refresh `docs/API_REFERENCE.md` with the new `/metadata/rematch` endpoint
- [ ] (docs)     Replace legacy `BACKEND_UPGRADE_*.md` files with a single changelog

### Deploy / Infra
- [ ] (deploy)   Migrate `deploy.yml` to Node 20 (already there — verify on every push)
- [ ] (infra)    Add uptime monitoring for `/health` (UptimeRobot or similar)

### AI / DX
- [ ] (dx)       Add a `pre-commit` hook that runs `npm run ci:check` (optional)

### Secrets
- [ ] (***REMOVED***s)  Onboard the rest of the team: each developer creates `***REMOVED***s/local/.env` and runs `npm run ***REMOVED***s:setup`
- [ ] (***REMOVED***s)  Migrate existing scattered `.env` files into `***REMOVED***s/local/.env` (one-time, per developer)

## Done  [x]  (last 30 days)
- [x] (docs) Created canonical `AGENTS.md` + tool-specific entry files — 2026-06-04
- [x] (docs) Reset `worklog.md`, `plan.md`, `TODO.md` to AGENTS.md format — 2026-06-04
- [x] (docs) Added `AGENTS.md` §17 ***REMOVED***s protocol — 2026-06-04
- [x] (***REMOVED***s) Created `***REMOVED***s/` folder, `docs/SECRETS.md`, `***REMOVED***s:setup` and `***REMOVED***s:check` scripts — 2026-06-04
- [x] (dx) Added `npm run agent:check` that verifies AGENTS.md and the three state files are in sync — 2026-06-04
- [x] (ci) Wired `agent:check` and `worklog:check` into `.github/workflows/deploy.yml` as a required `protocol-check` job — 2026-06-04
- [x] (backend) Fix broken/missing poster images for all 3000 published items; upgraded TMDB enrichment to 4-strategy search, cache bypass for broken paths, deleted sample duplicate — 2026-06-04
- [x] (frontend) Lazy-load `ContinueWatchingRail` — 2026-05-28
- [x] (backend) Push `type` filter into `listItems` for movie/series lists — 2026-05-25
- [x] (backend) Add `(status, type, updated_at)` index on `content_catalog` — 2026-05-25
- [x] (deploy) Switch `deploy.yml` to Node 20 — 2026-05-30
- [x] (frontend) Migrate `BrowsePage` to `useInfiniteQuery` — 2026-05-22
- [x] (frontend) Add SWR caching headers in `apiClient` — 2026-05-22
