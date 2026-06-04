# Auto

(Plan: Wire `npm run agent:check` into CI as a required pre-deploy check.)

## Goal
A broken or drifted AI agent protocol (e.g. someone adds a per-tool entry file
without pointing it back to `AGENTS.md`, or removes one of the three state
files) must fail the build *before* the deploy job runs SSH into production.
The check must be fast (< 30s), free (must run on a public runner, not
self-hosted), and must not depend on the developer's local `***REMOVED***s/local/`.

## Affected files
- `.github/workflows/deploy.yml` (add a new `protocol-check` job, make the
  `deploy` job depend on it)
- `scripts/check-worklog-freshness.cjs` (new — small helper used by the
  workflow; parses the latest `Date:` line in `worklog.md` and fails if it
  is older than 14 days)
- `package.json` (add `worklog:check` script)
- `docs/AI_AGENTS.md` (note: this check is now part of CI)
- `TODO.md` (mark the wiring task as done; add the new freshness check task)
- `worklog.md` (append the entry once the change is verified)

## Steps
- [x] 1. Read `.github/workflows/deploy.yml` (753 lines, self-hosted runner,
       `push to main` + `workflow_dispatch` triggers) and confirm structure.
- [x] 2. Decide the placement: a new top-level `protocol-check` job that runs
       on `ubuntu-latest`, depends on nothing, and the existing `deploy` job
       adds `needs: protocol-check`. This is cleaner than a step inside the
       existing job because the protocol check is fast and free, while the
       deploy job is slow and self-hosted.
- [ ] 3. Create `scripts/check-worklog-freshness.cjs` that:
         a. Reads `worklog.md`
         b. Parses the first `Date: YYYY-MM-DD HH:MM` line
         c. Exits 0 if the date is within the last 14 days
         d. Exits 1 with a clear message otherwise
       The script must be self-contained, no external deps, just Node stdlib.
- [ ] 4. Add `worklog:check` to `package.json` scripts.
- [ ] 5. Add the new `protocol-check` job to `.github/workflows/deploy.yml`:
         - runs-on: ubuntu-latest
         - steps: checkout, setup-node@v5 (Node 20), run `npm run agent:check`,
           run `npm run worklog:check`.
       Add `needs: protocol-check` to the existing `deploy` job.
- [ ] 6. Note in the workflow file: `***REMOVED***s:check` is intentionally NOT run
       in CI because CI does not have access to `***REMOVED***s/local/.env` (that
       file is developer-local). Local devs run it themselves.
- [ ] 7. Add a "CI wiring" section to `docs/AI_AGENTS.md` pointing to the new
       job and the freshness tolerance.
- [ ] 8. Run `npm run agent:check` locally to make sure the new `worklog:check`
       script doesn't break anything.
- [ ] 9. Verify the workflow syntax with `node -e` or a YAML lint if available.
       (We don't have actionlint installed; basic syntax check is fine.)
- [ ] 10. Commit the change with a `ci(dx):` prefix per the commit convention.

## Decisions / trade-offs
- **Why a new job, not a step inside `deploy`?** The deploy job runs on a
  self-hosted runner. Adding any step to it means a broken protocol would
  consume runner time. A new `ubuntu-latest` job is free, fast, and fails
  before the deploy ever starts.
- **Why not also run `***REMOVED***s:check` in CI?** It would always fail because
  `***REMOVED***s/local/.env` is gitignored and per-developer. The right place for
  it is local dev and a pre-commit hook (future work, tracked in `TODO.md`).
- **Why 14 days for freshness, not 7 or 30?** Speed4You ships almost every
  day (the worklog shows back-to-back fixes on 2026-05-30 to 2026-06-04).
  7 days is too tight (a long weekend + a holiday would false-positive).
  30 days lets a stale protocol rot. 14 days is the sweet spot: it forces
  a touch every other week at most, which is well below the actual cadence.
- **Why not block on `***REMOVED***s:check --required=...` in CI?** Same reason:
  the ***REMOVED***s are not in CI. If we ever add a CI-level ***REMOVED***s source (e.g.
  HashiCorp Vault), we can revisit. For now, the local `***REMOVED***s:check` is
  the only place that can see the developer's `***REMOVED***s/local/.env`.
- **Why not use actionlint or yaml-lint?** Not currently in the repo. The
  workflow is simple enough to eyeball; if it breaks, the next deploy will
  tell us quickly.

## Verification
- `npm run agent:check` → still passes (the new script doesn't break it)
- `npm run worklog:check` → passes (latest entry is 2026-06-04, well within
  14 days)
- `npm run worklog:check` with a fake stale worklog → fails with a clear
  message
- Manually read the new workflow file top to bottom; confirm `needs:` is
  spelled correctly and the job names match.
- The next `git push` to main (when the user pushes) will exercise the new
  job for real. No need to force a push now.

---

**How to use this file**
- This is a starter template. The next agent should overwrite the body (keep the
  `# Auto` header) with a real plan when starting a non-trivial task.
- For trivial changes (typos, single-line tweaks), skip the plan and just commit.
- See `AGENTS.md` §6 for the full format spec and `AGENTS.md` §7 for the workflow.
