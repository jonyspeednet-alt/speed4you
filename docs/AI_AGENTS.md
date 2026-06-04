# AI Agent & Model Protocol — Speed4You

> **For humans.** This document explains *why* the AI agent protocol exists and
> *how* it works. The actual rules the AI agents must follow live in
> [`AGENTS.md`](../AGENTS.md). The per-tool entry files (Claude Code, Cursor,
> Copilot, Aider, Kilo Code, Windsurf, Roo Code, Gemini CLI, etc.) are thin
> pointers back to `AGENTS.md`.
>
> If you are an AI agent, **stop reading this and go read
> [`AGENTS.md`](../AGENTS.md) first.** Then come back here only if you want
> the human-side context.

---

## 1. Why this exists

Speed4You is worked on by a rotating cast of AI tools (opencode, Claude Code,
Cursor, Aider, Kilo Code, GitHub Copilot, Roo Code, Windsurf, Gemini CLI) and
human maintainers. Without a shared protocol:

- Two agents editing the same file at the same time can clobber each other's
  work.
- An agent that picks up a half-done task has no idea what the previous agent
  did or what the next step is.
- Every tool has its own "agent instructions" file name (`.cursorrules`,
  `.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`,
  `.aider.conf.yml`, `.kilocode/instructions.md`, `.windsurfrules`,
  `.roo/rules/`, etc.) — duplicating the rules into each one is a maintenance
  nightmare and they drift apart within weeks.

The protocol in this repo solves all three problems with a single source of
truth and a small set of shared state files.

---

## 2. The protocol in one diagram

```
                        ┌─────────────────────┐
                        │      AGENTS.md      │  ← the only place rules live
                        │  (canonical manual) │
                        └──────────┬──────────┘
                                   │
                ┌──────────────────┼────────────────────────┐
                │                  │                        │
        ┌───────▼──────┐   ┌───────▼────────┐   ┌───────────▼──────────┐
        │  CLAUDE.md   │   │ .cursorrules    │   │  .github/copilot-    │  ← thin pointers
        │  .aider.*    │   │ .cursor/rules/* │   │  instructions.md     │    (no rules)
        │  GEMINI.md   │   │ .windsurfrules  │   │  .kilocode/*         │
        │  ...         │   │  ...            │   │  ...                 │
        └──────────────┘   └────────────────┘   └──────────────────────┘
                │                  │                        │
                └──────────────────┼────────────────────────┘
                                   ▼
                        ┌─────────────────────┐
                        │  worklog.md         │  ← append-only log
                        │  plan.md            │  ← active plan
                        │  TODO.md            │  ← master task list
                        └─────────────────────┘
```

Every agent, regardless of which tool runs it, follows the same five-step
procedure (defined in `AGENTS.md` §7):

1. **Orient** — read `AGENTS.md`, then `worklog.md`, `TODO.md`, `plan.md`.
2. **Scope** — confirm the task; write a plan for non-trivial work.
3. **Implement** — read every file before editing; follow the coding standards.
4. **Verify** — run lint / tests / build / smoke; do not claim "done" until they pass.
5. **Hand off** — update `plan.md`, `TODO.md`, `worklog.md`, then commit.

---

## 3. The three state files (the contract between agents)

| File | Read at | Write at | Format |
|---|---|---|---|
| `AGENTS.md` | start of task | rarely (only when the protocol changes) | this repo's canonical manual |
| `worklog.md` | start of task | end of every task (append) | date, agent, what changed, next step |
| `plan.md` | start of task | end of every task (edit in place) | 3–5 step plan with checkboxes |
| `TODO.md` | start of task | end of every task (`[~]` → `[x]`) | grouped master list with status |

`worklog.md` is **append-only**. No agent edits or deletes a peer's entries —
that history belongs to the team. If a previous entry is wrong, add a new entry
that points to the old one and explains the correction.

---

## 4. Onboarding a new AI tool

1. Check the table in `AGENTS.md` §13 for the tool's conventional entry file
   (e.g. `.cursor/rules/`, `CLAUDE.md`, `.windsurfrules`).
2. Create a thin entry file whose entire body is "Read `AGENTS.md` first."
   See the existing entry files for the exact shape.
3. Add a row to the table in `AGENTS.md` §13 with a ✅ in the "currently in
   repo?" column.
4. Add the new file to the `TOOL_ENTRY_FILES` array in
   `scripts/verify-agents-md.cjs` so the next `npm run agent:check` covers it.
5. Run `npm run agent:check` to confirm the wiring is correct.

That's it. The new tool now follows the same protocol as every other one.

---

## 5. Verifying the protocol

```bash
npm run agent:check
```

This runs `scripts/verify-agents-md.cjs`, which checks that:

- The shared state files (`AGENTS.md`, `worklog.md`, `plan.md`, `TODO.md`,
  `docs/AI_AGENTS.md`, `docs/SECRETS.md`, the ***REMOVED***s protocol files) exist
  and are non-empty.
- Every per-tool entry file exists and references `AGENTS.md`.
- The `.gitignore` covers the agent-scratch patterns
  (`.scratch/`, `scratch-*.md`, `.task-*.md`, `.agent-scratch/`, `***REMOVED***s/local/`).
- `package.json` exposes the `agent:check` and `***REMOVED***s:check` scripts.

For a full sweep (recommended before every commit):

```bash
npm run ci:check   # runs agent:check + worklog:check
```

- `agent:check` — protocol integrity (does every entry file still point back
  to `AGENTS.md`?).
- `worklog:check` — freshness: is the latest `Date:` in `worklog.md` within
  the last 14 days? If not, the team has been silent for too long and
  CI fails.

### 5.1 CI wiring (already done in this repo)

`.github/workflows/deploy.yml` has a top-level `protocol-check` job that runs
on `ubuntu-latest` (free, public runner, ~10s) and runs both checks:

```yaml
protocol-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v5
      with: { node-version: 20 }
    - run: npm run agent:check
    - run: npm run worklog:check
```

The existing `deploy` job has `needs: protocol-check`, so a broken protocol
fails the build *before* the self-hosted runner is even contacted. The
freshness threshold is 14 days — see `plan.md` for why that number, and bump
it in `scripts/check-worklog-freshness.cjs` if the team's cadence changes.

### 5.2 Why not also run `***REMOVED***s:check` in CI?

Because `***REMOVED***s:check` reads `***REMOVED***s/local/.env` (gitignored, per-developer).
CI has no access to that file. Running it in CI would always fail with
"missing master .env" and the team would just disable the check — worse than
not having it. The right place for `***REMOVED***s:check` is:

- **Local dev** — `npm run ***REMOVED***s:check` before pushing.
- **Pre-commit hook** — planned, tracked in `TODO.md` under *AI / DX*.

If a future CI step needs to read production ***REMOVED***s, those live in GitHub
Actions ***REMOVED***s (`***REMOVED***s.*`) and should be validated by a separate
production-***REMOVED***s workflow, not by `***REMOVED***s:check`.

---

## 6. When the protocol is allowed to change

The protocol itself (`AGENTS.md` + the three state files) is versioned with
the repo. Any change to it requires a `docs(agents):` commit and a note in
`worklog.md`. When the team grows, add a *Maintainers* section to the bottom
of `AGENTS.md` so the ownership of the protocol is explicit.

If you want to extend the protocol (add a new state file, a new entry file,
a new convention), open an issue first to discuss it — these are decisions
that affect every contributor and every AI tool working on the project.

---

*This file is for humans. The actual contract lives in `AGENTS.md`.*
