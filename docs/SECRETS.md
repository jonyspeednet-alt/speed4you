# Secrets Protocol — Speed4You

> **For humans.** This is the team-facing guide to the ***REMOVED***s protocol. The
> machine-readable rules the AI agents follow live in [`AGENTS.md`](../AGENTS.md)
> §17. The script entry points are:
>
> - `npm run ***REMOVED***s:setup` — install local ***REMOVED***s to the right places
> - `npm run ***REMOVED***s:check` — verify that everything is in place

---

## 1. The problem this solves

Before this protocol, ***REMOVED***s were scattered:

- `backend/.env` (sometimes, on some machines)
- `.env` at the project root (other times)
- `deploy_key` at the project root (still other times)
- Random `*.env` files in `data-file-browser/`, `scratch/`, `New folder/`
- A `DEPLOYMENT-SECRETS.md` that contained real keys in the past (now removed)

When an AI agent (or a new human) joined, they had to:

1. Search the repo for `.env*` files
2. Ask "where is the JWT ***REMOVED***?"
3. Look in five different places
4. Sometimes find nothing, get blocked, ask the user
5. Sometimes accidentally commit a real ***REMOVED*** to git

This protocol collapses all of that into one folder, two scripts, and a small
set of rules. **Read this once. The next onboarding takes 60 seconds.**

---

## 2. The folder structure

```
***REMOVED***s/
├── README.md              ← committed — the agent-facing protocol
├── .gitkeep               ← committed — placeholder so the folder is tracked
├── examples/              ← committed — templates only, no real values
│   ├── .env.example
│   └── deploy_key.example
└── local/                 ← GITIGNORED — never committed
    ├── .env               ← the master env file
    ├── deploy_key         ← SSH private key (no extension, no passphrase)
    └── deploy_key.pub     ← SSH public key
```

**Only `***REMOVED***s/README.md`, `***REMOVED***s/.gitkeep`, and `***REMOVED***s/examples/` are
committed.** Everything under `***REMOVED***s/local/` is gitignored.

---

## 3. Onboarding a new developer (60 seconds)

1. **Receive the ***REMOVED*** bundle** from the team lead via a secure channel
   (1Password, Bitwarden Send, encrypted email, USB stick — never Slack/Discord).
   The bundle is a zip/tar with:
   - `***REMOVED***s-local/.env` (the master env file)
   - `***REMOVED***s-local/deploy_key`
   - `***REMOVED***s-local/deploy_key.pub`
2. **Extract the bundle** into the project root so that
   `***REMOVED***s/local/.env` and `***REMOVED***s/local/deploy_key` exist.
3. **Run** `npm run ***REMOVED***s:setup`. The script will:
   - Copy `***REMOVED***s/local/.env` to `backend/.env` (backend reads at startup).
   - Copy env vars prefixed with `VITE_` to `frontend/.env.local`.
   - Copy `***REMOVED***s/local/deploy_key` to `./deploy_key` (project root) and
     set `chmod 600` (or `icacls` on Windows).
4. **Run** `npm run ***REMOVED***s:check`. The script will:
   - Confirm `***REMOVED***s/local/.env` exists and is readable.
   - Confirm `backend/.env` exists and contains the required keys.
   - Confirm `deploy_key` exists, is readable, and is a valid SSH key.
   - **Never print a value**, only the *names* of variables and a pass/fail.
5. **Start work**: `npm run dev`.

If any check fails, the error message tells you exactly which variable is
missing or which file is wrong. You don't have to guess.

---

## 4. Onboarding a new AI agent (30 seconds)

The agent reads `AGENTS.md` §17 (the protocol) and follows these steps:

1. **Run** `npm run ***REMOVED***s:check` to see what is available.
2. **If a required ***REMOVED*** is missing**, stop and ask the user. **Do not**
   search the repo, scan history, scrape logs, or improvise.
3. **Use the ***REMOVED***** by reading the file the setup script produced
   (e.g. `backend/.env`) via the `dotenv` package or by spawning a child
   process with the env in its environment.
4. **Never print a ***REMOVED***** to logs, console, commit messages, or chat.
5. **If the user asks "where is X?"**, answer "X is in `***REMOVED***s/local/.env`"
   without revealing the value. Run `npm run ***REMOVED***s:check` to verify it's
   actually present.
6. **On exit**, mark the task done in `worklog.md` and `TODO.md`. The
   ***REMOVED***s stay where they are.

The agent does **not** need to read this file. The rules in `AGENTS.md` §17
are sufficient. This file is for humans.

---

## 5. Common operations

### Rotate the JWT ***REMOVED***
```bash
# 1. Generate a new strong ***REMOVED***
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Paste it into ***REMOVED***s/local/.env (replace JWT_SECRET=...)

# 3. Re-install
npm run ***REMOVED***s:setup

# 4. Restart the backend
npm run dev
```

### Rotate the deploy SSH key
```bash
# 1. Generate a new key
ssh-keygen -t ed25519 -f ***REMOVED***s/local/deploy_key -N "" -C "deploy@speed4you"

# 2. Add the new public key to the server
ssh-copy-id -i ***REMOVED***s/local/deploy_key.pub user@server

# 3. Update GitHub repository ***REMOVED*** DEPLOY_SSH_KEY with the new private key

# 4. Re-install
npm run ***REMOVED***s:setup
```

### Add a new ***REMOVED*** (e.g. a new API key)
```bash
# 1. Add the variable to ***REMOVED***s/local/.env
echo "NEW_API_KEY=abc123" >> ***REMOVED***s/local/.env

# 2. Add the variable name to the REQUIRED_KEYS list in
#    scripts/check-***REMOVED***s.cjs so future checks verify it

# 3. Re-install
npm run ***REMOVED***s:setup
```

### What to do if a ***REMOVED*** is leaked

1. **Rotate it immediately** (do not just delete it — the old value is still
   out in the world).
2. **Audit the git history** for the leaked file:
   `git log --all --full-history -- ***REMOVED***s/local/<file>`.
3. If the file was ever committed, follow GitHub's guide to
   [remove sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
4. Update `worklog.md` with the incident.

---

## 6. What this protocol forbids

- ❌ Putting a real ***REMOVED*** in `***REMOVED***s/examples/` (only templates live there).
- ❌ Putting a real ***REMOVED*** in any `.md` file (including `worklog.md`).
- ❌ `cp ***REMOVED***s/local/.env backend/.env` by hand — always use
  `npm run ***REMOVED***s:setup` so permissions and formatting stay consistent.
- ❌ `git add ***REMOVED***s/local/...` — the `.gitignore` blocks it; if you ever
  see it in `git status`, stop and ask.
- ❌ Asking an AI agent to "just try the standard ***REMOVED***" or "look around
  the filesystem" — if the ***REMOVED*** is missing, the user must provide it.
- ❌ Echoing an env var to a log file or test output.

---

## 7. Where the protocol is enforced

| Layer | What it does |
|---|---|
| `***REMOVED***s/.gitignore` (via root `.gitignore`) | Blocks `***REMOVED***s/local/*` from git |
| `scripts/setup-***REMOVED***s.cjs` | Reads `***REMOVED***s/local/*`, writes the right places, never prints values |
| `scripts/check-***REMOVED***s.cjs` | Verifies everything is in place, only names pass/fail |
| `npm run ***REMOVED***s:setup` / `***REMOVED***s:check` | The only commands a human/agent should run |
| `npm run agent:check` | Verifies the entry files and `.gitignore` rules are correct |
| `AGENTS.md` §17 | The rules the AI agents follow |

Wire `npm run agent:check` and `npm run ***REMOVED***s:check` into CI so a missing
***REMOVED*** or a broken protocol fails the build before it ever ships.

---

## 8. Migrating an existing project to this protocol

The scripts are backward-compatible: if you already have `backend/.env`,
`.env.deploy`, or `deploy_key` at the project root, the setup script picks
them up. Nothing breaks.

To migrate cleanly:

1. Move the contents of `backend/.env` into `***REMOVED***s/local/.env`.
2. Move `deploy_key` and `deploy_key.pub` into `***REMOVED***s/local/`.
3. Run `npm run ***REMOVED***s:check` — it should pass.
4. Optionally delete the old scattered files. **Make sure** your team has
   the new bundle first.
5. Update onboarding docs to point to this file.

---

*This file is for humans. The machine-readable rules live in `AGENTS.md` §17.*
