# Project Worklog

Append-only chronological log of what was done, when, and by whom. New
entries go at the bottom. Existing entries are not edited; if a correction
is needed, add a new entry that points to the old one and explains.

---

---
Date: 2024-Q4 (bootstrap entry, consolidated by Super Z)
Session: Initial documentation audit and consolidation — cloned repo, audited 41 docs, found security/duplication issues, consolidated to focused set.

---
Date: 2026-06-04 12:52 (UTC+6)
Session: Fix broken/missing poster images and metadata for all 3000 published content items on production.
Status: completed
- Diagnosed root causes: stale `not_found` cache entries, year-filtered TMDB search returning zero for noisy filenames, local web-root relative paths invisible to `isGoodUrl`.
- Added `extractYearFromRawTitle()` and `extractCoreTitle()` fallback helpers.
- Upgraded TMDB search to 4 strategies: (1) cleaned title + year, (2) cleaned title without year, (3) core title, (4) `/search/multi` fallback.
- Added optional `forceRefresh` param to `fetchWithRateLimitAndCache()`; scanner bypasses cache for items with broken/local poster paths.
- Lowered TMDB confidence threshold from 70 → 60.
- Deployed via GitHub Actions (run 26933688448). Fixed 405→3 items via the admin endpoint, then rematched the remaining 3 individually.
- Final: 2998 published items, 0 null/broken posters, 100% metadata matched.
