# ⚠️  NEVER COMMIT ANY FILE FROM `***REMOVED***s/local/`

This folder is the **canonical location for local-only ***REMOVED***s** (SSH keys,
DB ***REMOVED***s, API keys, JWT ***REMOVED***s, admin credentials, etc.) on Speed4You.

The folder itself is committed (so the team has a stable location), but every
file under `***REMOVED***s/local/` is **gitignored** and **must never be committed**.

---

## Quick rules

1. **One folder for all ***REMOVED***s**: `***REMOVED***s/local/`. Don't scatter them.
2. **Use the `***REMOVED***s:setup` script** to install them in the right places —
   don't `cp` by hand.
3. **Run `***REMOVED***s:check` before you start work** to confirm the ***REMOVED***s are
   in place. Don't waste time discovering a missing key mid-task.
4. **Never print a ***REMOVED*** to a log, commit, or chat message.** The setup
   script only logs the *names* of variables it installed, never their values.
5. **Never commit a file from `***REMOVED***s/local/`.** The `.gitignore` blocks
   this; if you ever see a `***REMOVED***s/local/...` in `git status`, **stop and
   fix it before committing**.

---

## Folder layout

```
***REMOVED***s/
├── README.md                    # ← committed (this file — the protocol)
├── .gitkeep                     # ← committed (placeholder)
├── examples/                    # ← committed (templates only, no real values)
│   ├── .env.example             # template for the master .env
│   └── deploy_key.example       # template for SSH key (not a real key)
└── local/                       # ← GITIGNORED — every file in here is private
    ├── .env                     # master env file (DB, JWT, TMDB, CORS, ...)
    ├── deploy_key               # SSH private key for deploys
    └── deploy_key.pub           # SSH public key for deploys
```

The master `local/.env` is read by `scripts/setup-***REMOVED***s.cjs`, which copies
the right values into:

| Source | Destination | Notes |
|---|---|---|
| `***REMOVED***s/local/.env` | `backend/.env` | Backend reads at startup via dotenv |
| `***REMOVED***s/local/.env` | `frontend/.env.local` | Frontend reads via Vite |
| `***REMOVED***s/local/deploy_key` | `./deploy_key` (project root) | GitHub Actions uses this path |
| `***REMOVED***s/local/deploy_key.pub` | `./deploy_key.pub` | Public half of the key |

**If you already have `.env` files at the project root or in `backend/`, they
are still picked up.** The setup script prefers `***REMOVED***s/local/.env` if it
exists, then falls back to the existing root-level files. Nothing breaks.

---

## Why this exists

Without a canonical place, AI agents and humans waste time:

- Looking in 4 different locations for the same ***REMOVED***
- Asking the user "where do you keep the JWT ***REMOVED***?" five times
- Accidentally committing a `.env` to git because they didn't realize the
  `.gitignore` line was missing
- Re-typing a long SSH key into three different places by hand
- Wondering why a deployment failed because the `deploy_key` had the wrong
  permissions on Windows

This folder + the two scripts (`***REMOVED***s:setup`, `***REMOVED***s:check`) make all
of that go away.

See [`docs/SECRETS.md`](../docs/SECRETS.md) for the full team-facing guide
and onboarding steps.
