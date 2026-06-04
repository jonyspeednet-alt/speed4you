# CLAUDE.md — Claude Code entry point

> **Read `AGENTS.md` first.** It is the canonical operating manual for any AI
> agent or model working on Speed4You. This file is just a pointer so Claude Code
> can find it.
>
> Project: Speed4You — ISP Entertainment Portal (React + Express + PostgreSQL)
> Repo: https://github.com/jonyspeednet-alt/isp-entertainment-portal

## What you must read, in this order
1. `AGENTS.md` — rules, workflow, coding standards, commit format
2. `worklog.md` — what the previous agent (or human) just did
3. `TODO.md` — open vs. done tasks
4. `plan.md` — the active plan, if any

## What you must update, in this exact order, at the end of any task
1. `plan.md` — tick completed steps
2. `TODO.md` — move item from `[~]` to `[x]` (or back to `[ ]` with a note)
3. `worklog.md` — append a new entry per AGENTS.md §4
4. `git add <specific paths>` + `git commit` with a Conventional Commits message

## If you need a ***REMOVED***
- Read `AGENTS.md` §17 (Secrets protocol) first.
- Run `npm run ***REMOVED***s:check` to see what's available (no values printed).
- Run `npm run ***REMOVED***s:setup` to install ***REMOVED***s from `***REMOVED***s/local/` into the
  right places.
- If a required ***REMOVED*** is missing, **stop and ask the user** — do not grep,
  search git history, or try common defaults. See `AGENTS.md` §17.2 for the
  exact anti-patterns.

## Hard rules (see AGENTS.md for full list)
- Do not commit ***REMOVED***s, `.env`, `node_modules/`, `dist/`, or anything under
  `backend/src/data/` or `***REMOVED***s/local/`.
- Do not `git push` to `main` without explicit user approval.
- Do not edit a file you haven't read this session.
- Do not skip the verify step (lint, test, build, smoke) before claiming done.
- Do not create parallel `.md` files in the root — extend `AGENTS.md` instead.
