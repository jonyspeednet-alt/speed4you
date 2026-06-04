# GEMINI.md — Gemini CLI entry point

> **Read `AGENTS.md` first.** It is the canonical operating manual for any AI
> agent or model on Speed4You. The ***REMOVED***s protocol is in `AGENTS.md` §17.
> This file is a thin pointer for Gemini CLI.
>
> Project: Speed4You — ISP Entertainment Portal (React + Express + PostgreSQL)
> Repo: https://github.com/jonyspeednet-alt/isp-entertainment-portal

## Reading order (start of every task)
1. `AGENTS.md`
2. `worklog.md`
3. `TODO.md`
4. `plan.md`

## Update order (end of every task)
1. `plan.md`
2. `TODO.md`
3. `worklog.md` (append per AGENTS.md §4)
4. `git add <specific paths>` + `git commit` (Conventional Commits)

## If you need a ***REMOVED***
- Read `AGENTS.md` §17, then run `npm run ***REMOVED***s:check`. If missing, ask the user.

## Hard rules
- No ***REMOVED***s / `.env` / `node_modules` / `dist` / `backend/src/data/` / `***REMOVED***s/local/` in commits
- No `git push` to `main` without explicit user approval
- No editing files not read in this session
- No new top-level deps without asking
- No `git add .` — always specific paths
- Don't delete or rewrite other agents' worklog entries (the log is append-only)
