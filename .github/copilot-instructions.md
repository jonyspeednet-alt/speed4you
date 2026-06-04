# GitHub Copilot — Speed4You instructions

> **Read `AGENTS.md` first.** It is the canonical operating manual for any AI
> agent or model on this project. This file is just a pointer.
>
> Project: Speed4You — ISP Entertainment Portal (React + Express + PostgreSQL)
> Repo: https://github.com/jonyspeednet-alt/isp-entertainment-portal

## Required reading order
1. `AGENTS.md`
2. `worklog.md`
3. `TODO.md`
4. `plan.md`

## Required update order at the end of any task
1. `plan.md`
2. `TODO.md`
3. `worklog.md` (append a new entry per AGENTS.md §4)
4. `git add <specific paths>` + `git commit` (Conventional Commits)

## Code style
- Backend: CommonJS, Express 4, Joi validation on every route
- Frontend: ES modules, React 18 functional components only
- One component per file, PascalCase, in `frontend/src/components/...`
- API calls go through `frontend/src/services/*Service.js`, never raw `fetch` in components
- Database access via the `db` pool in `backend/src/config/database.js` — never raw `pg.Client` per request

## If you need a ***REMOVED***
- Read `AGENTS.md` §17, then run `npm run ***REMOVED***s:check` (no values printed).
- If the ***REMOVED*** is missing, ask the user. Never grep, never search git history.

## Do not
- Do not commit ***REMOVED***s, `.env`, `node_modules/`, `dist/`, or anything under `backend/src/data/` or `***REMOVED***s/local/`.
- Do not push to `main` without explicit user approval.
- Do not edit a file you have not read in the current session.
- Do not add new top-level dependencies without asking.
