# AGENTS.md — Speed4You Agent & Model Operating Manual

> **This is the single source of truth for any AI coding agent or model working on this project.**
>
> Read this file **first** before doing any work, regardless of which model, tool, or
> editor you are running in (opencode, Claude Code, Cursor, Aider, Kilo Code, GitHub
> Copilot, Roo Code, Cline, Continue, Cody, Windsurf, Gemini CLI, etc.). All tool-specific
> entry files (`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, etc.)
> point back to this document so that the rules stay consistent across the team.
>
> **Project:** Speed4You — ISP Entertainment Portal (React + Express + PostgreSQL)
> **Repo:** https://github.com/jonyspeednet-alt/isp-entertainment-portal
> **Last refreshed:** 2026-06-04

---

## 0. How to use this file

- If you are an AI agent/model: read sections 1–8 before you write a single character of code.
  Sections 9–13 are reference material; consult on demand.
- If you are a human setting up the project: skim section 1 (Quick Start), then read section 4
  (Workflow) to understand how work is logged so that your AI assistants can pick up where
  you left off.
- If you are porting this contract to a new tool, add a new section in section 13 and create a
  thin tool-specific entry file that simply says *"Read `AGENTS.md` first."*

---

## 1. Quick Start (one-time setup)

```bash
# 1. Clone
git clone https://github.com/jonyspeednet-alt/isp-entertainment-portal.git
cd isp-entertainment-portal

# 2. Install everything (frontend + backend)
npm run install:all

# 3. Backend env
cp backend/.env.example backend/.env 2>/dev/null || true
# Then edit backend/.env with DB credentials, JWT ***REMOVED***, CORS origins, TMDB key.

# 4. Initialize the database
cd backend && npm run db:init && cd ..

# 5. Start dev (frontend 4173, backend 3001)
npm run dev
```

**Prereqs:** Node.js 20+, npm 9+, PostgreSQL 14+, FFmpeg + ffprobe on `PATH`.

---

## 2. Project at a glance

| Layer | Tech | Location |
|---|---|---|
| Frontend | React 18 + Vite + TanStack Query + Framer Motion + react-window | `frontend/` |
| Backend | Express 4 (CommonJS) + Joi + JWT + Helmet + express-rate-limit | `backend/` |
| Database | PostgreSQL 14+ with JSONB columns | `backend/migrations/`, `backend/src/db/init.sql` |
| Media | FFmpeg (transcode/remux), custom player cache, scanner + normalizer | `backend/src/services/` |
| Dev runner | Single command starts both processes | `scripts/dev-runner.cjs` |
| Deploy | Self-hosted runner + GitHub Actions | `.github/workflows/deploy.yml` |

Full reference: `README.md`, `docs/API_REFERENCE.md`, `docs/DEPLOYMENT_GUIDE.md`.

---

## 3. The Three State Files (read/write these!)

These three files are the **shared, persistent state** that every agent reads at the start
of a task and appends to at the end. **Do not create parallel files.** When the user (or
another agent) opens a fresh session, the agent must read these to understand what is
happening.

| File | Purpose | When to update | Format |
|---|---|---|---|
| `worklog.md` | Append-only chronological log of what every agent did | **At the end of every task** | See section 4 |
| `TODO.md` | Master task list with `[ ]` / `[~]` / `[x]` status | When tasks are added, started, finished, or blocked | See section 5 |
| `plan.md` | Active plan for the **current** task (3–5 steps) | When starting a non-trivial task | See section 6 |

> If two agents edit the same file at the same time, the **last write wins** — but every
> agent must re-read the file before committing changes to avoid clobbering a peer's work.

### 3.1 Read order at the start of any task
1. `AGENTS.md` (this file) — rules
2. `worklog.md` — what was just done
3. `TODO.md` — what is open vs. done
4. `plan.md` — what is the active plan, if any

### 3.2 Write order at the end of any task
1. Update `plan.md` (mark steps `[x]`, add a new plan only if starting a new task)
2. Update `TODO.md` (move items from `[~]` to `[x]` or back to `[ ]` with a note)
3. Append to `worklog.md` (date, agent name, summary, files touched, next step)
4. `git add` + `git commit` with a Conventional Commit message

---

## 4. `worklog.md` format

Append a new entry at the **bottom** of the file. Never edit or delete old entries — that
history belongs to the team.

```markdown
---
Date: YYYY-MM-DD HH:MM (UTC offset)
Agent: <model/tool name>      # e.g., "Claude Sonnet 4 (opencode)", "Cursor + GPT-4o", "Kilo Code (Gemini 2.5)"
Session: <1-2 sentence summary of what was asked>
Branch: <git branch>
Status: completed | partial | blocked

Work:
- Bullet of concrete change 1 (file:line if relevant)
- Bullet of concrete change 2

Files touched:
- path/to/file1.jsx
- path/to/file2.js

Verification:
- npm run dev → both servers up
- /health → 200
- /portal-api/api/content/latest?limit=3 → JSON

Next step:
- Single sentence on what the next agent should pick up
```

The very first entry in the file is the bootstrap entry; keep it as a short example.

---

## 5. `TODO.md` format

Use a flat, scannable list. Group by area (`frontend`, `backend`, `docs`, `deploy`, `infra`)
when the list grows past ~15 items.

```markdown
# Master TODO — Speed4You

## In progress  [~]
- [~] (backend) Add retry on scanner transient failures — owner: claude-sonnet, started 2026-06-04
      note: blocked on pg-mem not supporting JSONB aggregates in tests

## Ready to do  [ ]
- [ ] (frontend) Virtualize the Bengali picks rail
- [ ] (backend)  Move scanner roots config from file to admin API
- [ ] (docs)     Refresh API_REFERENCE.md with the new /metadata/rematch endpoint

## Done  [x]  (last 30 days)
- [x] (deploy) Switch deploy.yml to Node 20 — 2026-05-30
- [x] (frontend) Lazy-load ContinueWatchingRail — 2026-05-28
```

Rules:
- Exactly one `[~]` per agent at a time. If you take on a second task, mark the first
  `[ ]` again with a note.
- Don't move items to `[x]` until the change is committed and verified locally.
- Anything older than 30 days that is `[x]` can be moved to `docs/TODO_HISTORY.md`.

---

## 6. `plan.md` format

Replace the entire file's body (keep the `# Auto` header) **only when starting a new task**.
While working on the active task, edit in place.

```markdown
# Auto
(Plan: <one-line title>)

## Goal
One paragraph: what does "done" look like for the user?

## Affected files
- backend/src/services/scanner.js
- backend/src/routes/admin.js

## Steps
- [x] 1. Investigate current behavior (read scanner.js, write a repro)
- [~] 2. Add retry wrapper around the failing call
- [ ] 3. Add a test in backend/tests/scanner.test.js
- [ ] 4. Update API_REFERENCE.md with the new behavior
- [ ] 5. Deploy to dev, verify with curl

## Decisions / trade-offs
- Picked exponential backoff with jitter over fixed delay because the upstream
  pg pool can spike up to 5s during peak hours.

## Verification
- npm test passes
- Manual: trigger scanner from admin UI, watch retry counter increment on failure
```

A `plan.md` is required for any task that touches more than one file or is not a one-line
fix. For trivial changes (typos, single-line tweaks), skip the plan and just commit.

---

## 7. The standard workflow (apply this every time)

Use this **5-step procedure** for every task, in order. Skipping steps is how work gets
lost or duplicated.

### Step 1 — Orient
- Re-read sections 1–6 of this file.
- Read `worklog.md`, `TODO.md`, `plan.md` in that order.
- Run `git status` and `git log --oneline -10`. Make sure you are on the expected branch
  and the working tree is clean enough to start.
- If you don't know which branch you should be on, **ask the user** — do not guess.

### Step 2 — Scope
- Confirm the task with the user in 1–2 sentences. If anything is ambiguous, ask
  clarifying questions *before* writing code (architecture, UX, data-shape decisions).
- Classify the task:
  - **Trivial** (typo, single-line tweak) → skip the plan, go to Step 3.
  - **Small** (1–3 files, clear intent) → 2–3 sentences in `plan.md`, then go.
  - **Medium** (multi-file, design decisions) → full plan in `plan.md` (section 6).
  - **Large** (new feature, cross-cutting, unclear scope) → write `requirements.md` +
    `spec.md` under `docs/specs/<task-slug>/` first, then a real `plan.md`.
- Estimate the blast radius. If the change touches `backend/src/index.js`,
  `backend/migrations/`, or `.github/workflows/`, treat it as Large.

### Step 3 — Implement
- Follow the **Coding Standards** in section 9.
- For each file you touch, read it first with the `read` tool, then make the smallest
  change that solves the problem.
- Use `todowrite` to track sub-steps for Medium/Large tasks.
- Never edit files under `node_modules/`, `frontend/dist/`, `backend/src/data/` (runtime
  data), or any path that starts with `backend/.cache/`.

### Step 4 — Verify
Run **all** of the relevant commands below. A task is not "done" until they pass.

| Layer | Command | When |
|---|---|---|
| Frontend lint | `cd frontend && npm run lint` | Any frontend change |
| Backend tests | `cd backend && npm test` | Any backend change |
| Backend smoke | `cd backend && node -e "require('./src/index.js')" &` then `curl localhost:3001/health` | Any backend change |
| Build | `npm run build` | Any change to `frontend/src/`, `vite.config.js`, `package.json` |
| Dev full-stack | `npm run dev` | Any change spanning both layers |

If a check fails, **fix it before claiming the task is done** — do not move on.

### Step 5 — Hand off
In this exact order:
1. Mark steps complete in `plan.md`.
2. Move the item in `TODO.md` from `[~]` to `[x]` (with date).
3. Append a new entry to `worklog.md` (section 4 format).
4. `git add` the specific files you changed — *no `git add .` and no `git add -A`*.
5. `git commit` with a Conventional Commits message (section 10).
6. **Do not push** unless the user explicitly asks. Do not open a PR unless asked.

---

## 8. Cross-agent handoff protocol (the key idea)

Because the user (or teammate) may switch between Claude Code, opencode, Cursor, Aider,
Kilo Code, and GitHub Copilot at any moment, every agent must leave enough breadcrumbs for
the next one. The protocol is simple:

1. **The state files (`worklog.md`, `TODO.md`, `plan.md`) are the contract.** The next agent
   will read them and know exactly what you did and what's next.
2. **No agent owns a task indefinitely.** When you stop, mark `[~]` in `TODO.md` and
   write a `Next step:` in `worklog.md` — never leave a task in flight with no breadcrumb.
3. **Don't clean up someone else's scratch.** If you find `.scratch/`, `scratch.js`,
   `.kilocode/tasks/*`, `.opencode/`, etc., leave them — they may belong to another agent.
4. **Never commit ***REMOVED***s.** The `.gitignore` already blocks `.env*`, `deploy_key*`,
   `*.sqlite`, `*.db`. Do not force-add them. If a ***REMOVED*** slipped into a file, tell the
   user immediately.
5. **Avoid destructive git operations** (`reset --hard`, `clean -fd`, `push --force`,
   `branch -D`) unless the user explicitly asked. Always confirm with the user first.

This means the same task can be picked up by Claude Sonnet in opencode, dropped, picked
up by GPT-4o in Cursor, dropped, and finished by Gemini 2.5 in Kilo Code — without losing
any work.

---

## 9. Coding standards (project-wide)

### 9.1 General
- Match the style of the file you are editing. If a file uses tabs, use tabs. If it uses
  2-space, use 2-space. If it uses semicolons, use semicolons.
- No comments unless they explain *why*, not *what*. The code itself shows *what*.
- One export per file is the default; multi-export is OK for small related helpers.
- Delete dead code. Don't leave `// TODO remove` behind — actually remove it or turn it
  into a tracked `TODO.md` item.
- Never introduce a new top-level dependency without asking. Use what is already in
  `package.json`.

### 9.2 Frontend (React + Vite)
- **Module system:** ES modules (`import` / `export`). Vite handles it.
- **Components:** Functional only, hooks only, no class components. One component per
  file. Filename matches the component name in PascalCase (`HeroCarousel.jsx`).
- **State:** Local `useState` first; lift to context only when ≥3 components need it.
  For server state, use TanStack Query (`useQuery`, `useInfiniteQuery`) — never raw
  `fetch` in components.
- **Routing:** `frontend/src/app/router.jsx`. New pages get a lazy `lazy()` import.
- **Styling:** Global CSS in `frontend/src/styles/`, component CSS modules next to the
  component. Tailwind is **not** used here — do not introduce it.
- **API calls:** Always go through `frontend/src/services/*Service.js`. Components
  never call `fetch`/`axios` directly.
- **Breakpoints:** mobile ≤640, tablet ≤1024, desktop ≤1440, TV ≤2560, 4K >2560. Use
  the existing `useTVMode` hook; do not roll your own viewport detection.

### 9.3 Backend (Express)
- **Module system:** CommonJS (`require` / `module.exports`). The `package.json` has
  `"type": "commonjs"`.
- **Structure:** Routes in `backend/src/routes/`, controllers in `backend/src/controllers/`,
  business logic in `backend/src/services/`, data access in `backend/src/data/store/`.
- **Validation:** Every route that accepts a body or query **must** use the Joi
  `validate` middleware from `backend/src/middleware/validate.js`. If a schema doesn't
  exist, add it to `backend/src/utils/validation-schemas.js`.
- **Auth:** `requireAdminAuth` for admin routes, `resolveUserId` for user-bound routes.
  Never roll your own token check.
- **Errors:** Throw `HttpError` from `backend/src/utils/error.js`. Do not `res.status(500).send(...)`
  manually.
- **Logging:** Use `logger` from `backend/src/utils/logger.js`, not `console.log`.
- **Database:** Use the `db` pool from `backend/src/config/database.js`. Never open a
  new `pg.Client` per request. Never use the raw `pg` driver in route handlers.
- **Migrations:** Add a new file under `backend/migrations/` named `NNN-description.sql`.
  Never edit an already-applied migration. The list is in `backend/migrations/` — read it.

### 9.4 Naming
| Thing | Convention | Example |
|---|---|---|
| React components | PascalCase | `HeroCarousel.jsx` |
| Hooks | `use*` camelCase | `useCarouselConfig.js` |
| Services / utils | camelCase | `contentService.js` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| CSS classes | kebab-case or CSS modules | `.continue-watching-rail` |
| DB columns / tables | snake_case | `content_catalog`, `watchlist_entries` |
| Env vars | UPPER_SNAKE_CASE | `JWT_SECRET` |
| Branches | `type/short-slug` | `feat/watchlist-sort`, `fix/player-504` |
| Commits | Conventional Commits | `feat(frontend): add sort dropdown to watchlist` |

---

## 10. Commit messages (Conventional Commits)

```
<type>(<scope>): <subject, imperative, ≤72 chars>

<body — explain WHY, not WHAT. Wrap at 72 chars.>

<footer — Refs #123, Closes #456, BREAKING CHANGE: ...>
```

| Type | Use for |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `docs` | Docs only (README, /docs, comments) |
| `style` | Whitespace, formatting, no logic change |
| `refactor` | Restructuring, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build, deps, CI, tooling |
| `ci` | CI config only |

Scopes: `frontend`, `backend`, `api`, `db`, `ui`, `auth`, `scanner`, `player`, `normalizer`,
`docs`, `deploy`, `infra`.

Examples:
```
feat(frontend): add genre filter chip to browse page

Allows subscribers to stack multiple genre filters. Uses URL query
params so the filter survives page refresh and is shareable.

Refs #142
```

```
fix(scanner): skip "Season 01" folders inside movie directories

Previously the scanner descended into season-styled folders under
movie roots and created phantom series entries. Now we treat any
folder matching /^(Season|S)\s*\d+/ as a leaf, regardless of root.

Closes #221
```

---

## 11. Branching & pull requests

- Default branch: `main`. All work happens on feature branches.
- Branch from `main`:
  - `feat/<slug>` for features
  - `fix/<slug>` for bug fixes
  - `docs/<slug>` for docs-only
  - `refactor/<slug>` for refactors
  - `chore/<slug>` for tooling/CI
- One concern per branch. If you find yourself mixing concerns, split into two PRs.
- PRs need: a description, the issue ref, the test plan, and screenshots for UI.
- Do not merge your own PR unless the user explicitly says so.

---

## 12. Environment variables (cheat sheet)

Full reference: `README.md` and `backend/src/config/env-check.js`. The minimum set the
backend refuses to start without in production is:

```
NODE_ENV=production
PORT=3001
DB_HOST=...
DB_PORT=5432
DB_NAME=isp_entertainment
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=<≥32 chars, never "***REMOVED***" or "***REMOVED***">
CORS_ALLOWED_ORIGINS=https://your.domain
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=<bcrypt hash, never plaintext>
TMDB_API_KEY=<optional but recommended>
PLAYER_CACHE_ROOT=/var/www/html/Extra_Storage/portal-media-cache
SCANNER_CACHE_DIR=/var/www/html/Extra_Storage/scanner-cache
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
TRUST_PROXY_HOPS=1
```

When in doubt, copy the block from `docs/DEPLOYMENT_GUIDE.md` §7 and replace the
`<YOUR_*>` placeholders.

---

## 13. Tool-specific entry points (the contract)

Every AI tool has a different file it looks at. To keep this manual as the single
source of truth, **all of these files are short pointers back to `AGENTS.md`**. Update
this section whenever you add a new tool to the team's toolbox.

| Tool | Entry file | Currently in repo? |
|---|---|---|
| opencode | `AGENTS.md` (this file) | ✅ |
| Claude Code | `CLAUDE.md` | ✅ (points to AGENTS.md) |
| Cursor (legacy) | `.cursorrules` | ✅ |
| Cursor (new) | `.cursor/rules/*.mdc` | ✅ |
| Aider | `.aider.conf.yml` | ✅ (read-only flag) |
| Kilo Code | `.kilocode/instructions.md` | ✅ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ |
| GitHub Copilot (instructions) | `.github/instructions/*.instructions.md` | ✅ |
| Gemini CLI | `GEMINI.md` | ✅ (points to AGENTS.md) |
| Project IDX | `.idx/dev.nix` | ✅ (untouched) |
| VS Code (general) | `.vscode/settings.json` | ✅ (Codegeex pointers) |
| Continue | `~/.continue/config.json` (user-level, not in repo) | n/a |
| Cody | `.vscode/cody.json` (deprecated, now uses Copilot instructions) | n/a |
| Windsurf | `.windsurfrules` | ✅ |
| Roo Code | `.roo/rules/` | ✅ |

**When you onboard a new tool:** add a thin entry file whose entire body is
`> Read AGENTS.md first.` and add a row to the table above.

---

## 14. Common commands

```bash
# Install
npm run install:all

# Dev (frontend 4173, backend 3001)
npm run dev

# Build frontend
npm run build

# Start production (serves built frontend + API)
npm run start

# Backend tests
cd backend && npm test

# Frontend lint
cd frontend && npm run lint

# DB init
cd backend && npm run db:init

# Run normalizer (one-file-at-a-time ffmpeg conversion)
cd backend && npm run media:normalize-library

# Backup DB
bash scripts/backup-db.sh

# Manual deploy (when GitHub Actions is unavailable)
bash scripts/one-click-deploy.ps1   # or .sh on Linux
```

---

## 15. Anti-patterns (do not do these)

- ❌ Don't create a new `.md` file in the project root without updating this manual and
  `README.md`'s TOC. If a doc belongs in a feature folder, put it there.
- ❌ Don't commit `.env`, `deploy_key`, `*.sqlite`, `*.db`, `node_modules/`, `dist/`,
  `build/`, or any file under `backend/src/data/`.
- ❌ Don't `git add .` or `git add -A`. Add specific paths so the user can review.
- ❌ Don't `git push` to `main` without the user's explicit go-ahead.
- ❌ Don't introduce a new package without first checking that the same job can't be done
  with what is already in `package.json`.
- ❌ Don't edit a file you haven't read with the `read` tool in the current session.
- ❌ Don't run `npm ci` / `npm install` in the user's working tree without asking — it
  can mutate `package-lock.json` and surprise the user.
- ❌ Don't claim "done" until the verify step (Step 4 in section 7) passes.
- ❌ Don't delete or rewrite other agents' worklog entries. The log is append-only.
- ❌ Don't fight the user. If they say "skip the plan", you skip the plan. If they say
  "use GPT-4o style comments", you do that. The user is the project lead.

---

## 16. Getting help

- The current maintainer's notes live in `worklog.md` and `docs/`.
- The full API is documented in `docs/API_REFERENCE.md`.
- Deployment: `docs/DEPLOYMENT_GUIDE.md` (the consolidated one).
- Architecture decisions: search `docs/` for the feature, then `worklog.md` for the
  reasoning at the time.
- **Human-readable protocol overview**: `docs/AI_AGENTS.md` — explains *why* the
  protocol exists and *how* the layers fit together. Useful for new maintainers
  and reviewers; not required reading for agents.
- **Secrets protocol (this section's sibling)**: `docs/SECRETS.md` and §17 below.
- If you (the agent) are stuck for more than 2 tool calls on a single question, stop
  and ask the user.

---

## 17. Secrets protocol (read this if you need a credential)

**TL;DR for agents:** Secrets live in `***REMOVED***s/local/`. To check what's available
without printing any value, run `npm run ***REMOVED***s:check`. To install them, run
`npm run ***REMOVED***s:setup`. If a ***REMOVED*** you need is missing, **stop and ask the
user** — do not grep, do not search git history, do not improvise.

### 17.1 The canonical location

There is **one** place where all local-only ***REMOVED***s live:

```
***REMOVED***s/
├── README.md              ← committed — the agent-facing protocol
├── .gitkeep               ← committed — placeholder
├── examples/              ← committed — templates only
│   ├── .env.example
│   └── deploy_key.example
└── local/                 ← GITIGNORED — never commit anything in here
    ├── .env               ← master env file (DB, JWT, TMDB, CORS, ...)
    ├── deploy_key         ← SSH private key for deploys
    └── deploy_key.pub     ← SSH public key for deploys
```

Everything under `***REMOVED***s/local/` is blocked by the root `.gitignore`. If you
ever see a `***REMOVED***s/local/...` path in `git status`, **stop and tell the
user** — they have to fix it before the commit can proceed.

### 17.2 What you must do at the start of a task that needs a ***REMOVED***

1. **Run `npm run ***REMOVED***s:check`** to see what is present. The script only
   reports variable *names* and pass/fail — it never prints values.
2. **If the ***REMOVED*** you need is present**, read it from the right place:
   - For env vars: `backend/.env` (or read the master `***REMOVED***s/local/.env`).
     Use `dotenv` or pass the env to a child process. Do not `console.log` it.
   - For SSH keys: use the path `./deploy_key` (project root) — the setup
     script copies it there with `chmod 600`. Do not read the key into a
     string in code; just point an SSH/library at the file path.
3. **If the ***REMOVED*** you need is missing**, stop and ask the user. Do not:
   - grep the repo for `.env`, `***REMOVED***`, `key`, `***REMOVED***`, etc.
   - search git history (`git log -p`, `git show`, `git reflog`).
   - try common defaults like `admin/admin`, `***REMOVED***`, `***REMOVED***`.
   - scan the file system outside the project.
   - read `node_modules/`, `dist/`, `backend/src/data/`, or any cache.
   - use a `find` command to look for `*.key` or `*.pem`.
   The right answer is: "I need `XYZ`. I can see you have these keys set
   in `***REMOVED***s/local/.env`: [list]. Could you add `XYZ` to the file and
   re-run `npm run ***REMOVED***s:setup`?" Then wait.

### 17.3 What you must do when you finish using a ***REMOVED***

- **Never write a ***REMOVED*** to a file outside `***REMOVED***s/`.** If a script needs an
  env var, write the env var to a tempfile outside the working tree, or
  pass it inline to the subprocess via `env: { ... }`. Do not commit a
  `.env` to a feature branch "just for testing".
- **Never print a ***REMOVED***.** Not in a log line, not in a `console.log`, not
  in a `curl` example, not in a commit message, not in `worklog.md`. If you
  need to mention that a ***REMOVED*** exists, refer to it by name
  (e.g. "JWT_SECRET is set") not by value.
- **If you accidentally print or commit a ***REMOVED*****, rotate it immediately
  and tell the user. Do not try to "fix" it by editing a single line —
  the value is already out.

### 17.4 The two scripts

```bash
# Check what's in place (no values printed, just names + pass/fail)
npm run ***REMOVED***s:check

# Check a specific key (CI / pre-deploy gate)
npm run ***REMOVED***s:check -- --required=JWT_SECRET

# Install ***REMOVED***s from ***REMOVED***s/local/ to the right places
npm run ***REMOVED***s:setup

# Show what would change without changing anything
npm run ***REMOVED***s:setup:dry
```

The `setup` script:
- Reads `***REMOVED***s/local/.env` (falls back to root `.env` if missing).
- Writes `backend/.env` (so the backend picks it up on `npm run dev`).
- Writes `frontend/.env.local` (Vite keys only — keys prefixed `VITE_`).
- Copies `***REMOVED***s/local/deploy_key` → `./deploy_key` with `chmod 600`
  (`icacls` on Windows).
- **Refuses to overwrite** by default; pass `--force` to override.

The `check` script:
- Verifies `***REMOVED***s/README.md`, `***REMOVED***s/.gitkeep`, `***REMOVED***s/examples/`
  exist.
- Verifies `***REMOVED***s/local/.env` exists, is readable, and contains the
  required keys (DB_*, JWT_SECRET, ADMIN_*, CORS_ALLOWED_ORIGINS, etc.).
- Verifies `***REMOVED***s/local/deploy_key` is a valid SSH private key.
- Warns on placeholder values like `CHANGE_ME_*` or `<YOUR_*>`.
- **Never prints a value**, only names and pass/fail.

### 17.5 The full team-facing guide

Humans (and reviewers) should read [`docs/SECRETS.md`](docs/SECRETS.md). It
covers onboarding, rotation, incident response, and how to migrate an
existing project to this protocol.

### 17.6 Where this is enforced

| Layer | What it does |
|---|---|
| `.gitignore` | Blocks `***REMOVED***s/local/*`, all `*.key`, `*.pem`, `*.p12` under `***REMOVED***s/` |
| `***REMOVED***s/README.md` | Agent-facing rules |
| `docs/SECRETS.md` | Human-facing guide |
| `scripts/setup-***REMOVED***s.cjs` | Installs ***REMOVED***s, never prints values |
| `scripts/check-***REMOVED***s.cjs` | Validates, never prints values |
| `npm run agent:check` | Verifies the entry files and `.gitignore` rules are correct |
| `npm run ***REMOVED***s:check` | Verifies the ***REMOVED***s are actually in place |

Wire both into CI so a missing ***REMOVED*** or a broken protocol fails the build
before it ever ships.

### 17.7 Anti-patterns (do not do these)

- ❌ Do not `cat ***REMOVED***s/local/.env` or `printenv | grep` and paste the
  output anywhere — even into a private chat.
- ❌ Do not run `git log -p -- ***REMOVED***s/local/...` looking for old ***REMOVED***s.
- ❌ Do not suggest "let me try a few common ***REMOVED***s" to bypass a missing
  credential. That's a security incident, not a workaround.
- ❌ Do not commit a `***REMOVED***s/local/` file "temporarily" with the intention
  of removing it later. There is no "later" — the value is out forever.
- ❌ Do not copy a ***REMOVED*** from one `.env` to another across the repo.
  Use the `***REMOVED***s:setup` script so the format and permissions stay right.
- ❌ Do not echo a ***REMOVED*** in a test fixture, even a fake one — a real
  ***REMOVED*** can land in a fixture by accident. Use `process.env.MY_KEY` with
  a documented stub.

---

---

*This file is versioned with the repo. Changes to this file require a `docs(agents):`
commit and a note in `worklog.md`. When the team grows, add a maintainer section to the
end of this file.*
