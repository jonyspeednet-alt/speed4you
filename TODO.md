# Master TODO — Speed4You

Master task list. Pick an item from "Ready to do" and mark it `[~]`
while you work on it, then move it to `[x]` in "Done" when verified.

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

### Docs

### Deploy / Infra
- [ ] (deploy)   Migrate `deploy.yml` to Node 20 (already there — verify on every push)
- [ ] (infra)    Add uptime monitoring for `/health` (UptimeRobot or similar)

## Done  [x]  (last 30 days)
- [x] (docs)     Refresh `docs/API_REFERENCE.md` with the new `/metadata/rematch` endpoint — 2026-06-08
- [x] (docs)     Replace legacy `BACKEND_UPGRADE_*.md` files with a single changelog — 2026-06-08
- [x] (db)       Add migration for `metadata_status` index in `content_catalog` — 2026-06-08
- [x] (backend) Fix broken/missing poster images for all 3000 published items; upgraded TMDB enrichment to 4-strategy search, cache bypass for broken paths, deleted sample duplicate — 2026-06-04
- [x] (frontend) Lazy-load `ContinueWatchingRail` — 2026-05-28
- [x] (backend) Push `type` filter into `listItems` for movie/series lists — 2026-05-25
- [x] (backend) Add `(status, type, updated_at)` index on `content_catalog` — 2026-05-25
- [x] (deploy) Switch `deploy.yml` to Node 20 — 2026-05-30
- [x] (frontend) Migrate `BrowsePage` to `useInfiniteQuery` — 2026-05-22
- [x] (frontend) Add SWR caching headers in `apiClient` — 2026-05-22

