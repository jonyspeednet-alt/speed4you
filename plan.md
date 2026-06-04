# Auto

(Plan: add a pre-commit hook that runs `npm run agent:check` so a broken
protocol fails locally, before pushing.)

## Goal
A broken or drifted AI agent protocol (e.g. someone adds a per-tool entry
file without pointing it back to `AGENTS.md`) must fail the developer's
local commit, not just the CI build. The hook is opt-in (one
`npm run setup:hooks` install), cross-platform, and respects `--no-verify`.

## Affected files
- `scripts/pre-commit-hook.cjs` (new — the hook itself, written in Node so
  it works on Windows, macOS, and Linux without requiring bash)
- `scripts/install-hooks.cjs` (new — copies the hook into `.git/hooks/pre-commit`,
  with `--uninstall` to remove; idempotent and safe to re-run)
- `package.json` (add `setup:hooks` and `uninstall:hooks` scripts)
- `README.md` (one-paragraph mention in the "For AI Agents & Models" section)
- `CONTRIBUTING.md` (mention in the AI-Assisted Contributions section)
- `docs/AI_AGENTS.md` (brief note in §5 "Verifying the protocol")
- `TODO.md` (mark `[x]`)
- `worklog.md` (append entry)

## Steps
- [x] 1. Read AGENTS.md §14 "Common commands" and §15 "Anti-patterns" so the
       hook does not duplicate existing rules.
- [x] 2. Decide: pure Node hook (works everywhere Node runs, no bash
       dependency). Bash on Windows is awkward; PowerShell on macOS/Linux
       does not exist; Node is a project dep so it is always present.
- [x] 3. Write `scripts/pre-commit-hook.cjs` that:
         - runs `npm run agent:check` via `child_process.spawnSync`
         - on failure: prints a clear "Pre-commit failed" message that
           tells the user how to bypass (`git commit --no-verify`) and
           how to fix
         - on success: prints "OK" and exits 0
- [x] 4. Write `scripts/install-hooks.cjs` that:
         - resolves the hooks dir (default `.git/hooks`, respect
           `core.hooksPath` if set)
         - refuses to overwrite a pre-existing `pre-commit` unless
           `--force` is passed (saves a `.bak`)
         - makes the hook executable on POSIX (chmod 755)
         - supports `--uninstall` to remove the hook and restore the
           backup
         - supports `--help`
- [x] 5. Add `setup:hooks` and `uninstall:hooks` to `package.json`.
- [x] 6. Update `README.md` ("For AI Agents" callout), `CONTRIBUTING.md`
       (AI-Assisted Contributions), and `docs/AI_AGENTS.md` (§5) with a
       short note that `npm run setup:hooks` is the recommended local
       install.
- [x] 7. Run `npm run setup:hooks` once to install the hook on this
       machine so I (and the user, by extension) benefit from it
       immediately.
- [x] 8. Verify: `npm run agent:check` exits 0 (the hook should pass on
       this commit), the hook file exists at `.git/hooks/pre-commit`,
       and the hook is executable.
- [x] 9. Verify `--uninstall` works (run it and re-install, just to
       prove the round-trip).
- [x] 10. Update `TODO.md` (move the task to `[x]`) and append a
        `worklog.md` entry.
- [x] 11. Commit with a `chore(dx):` prefix.

## Decisions / trade-offs
- **Why run `agent:check` only, not `ci:check`?** The hook runs at
  pre-commit, which is *before* the worklog entry is written. The
  current `worklog:check` would either always pass (because the entry
  was just added) or fail spuriously (if the developer is in the
  middle of a longer commit and the worklog is mid-update). The right
  home for `worklog:check` is CI (already done in `304fc0a`).
- **Why a Node hook, not bash?** Bash is missing on most Windows dev
  machines. PowerShell does not exist on macOS/Linux. Node is a project
  dependency so it is always present. Writing the hook in Node also
  means Windows users do not need to deal with CRLF/LF in the hook
  file.
- **Why not use Husky / simple-git-hooks?** Both are popular but add a
  dependency. AGENTS.md §9.1 says "Never introduce a new top-level
  dependency without asking." A 30-line Node script is the same job
  with no new deps.
- **Why `chmod 755`?** That is the standard for git hooks on POSIX.
  On Windows, the executable bit is irrelevant — the hook will run
  anyway when git invokes it.
- **Why not auto-install on `npm install`?** Because the user's `.env`
  and `***REMOVED***s/local/` are not ready at install time, and forcing a
  hook install on every install is intrusive. The user opts in with
  one `npm run setup:hooks`.

## Verification
- `npm run setup:hooks` → hook installed, `cat .git/hooks/pre-commit`
  shows the Node script
- `npm run agent:check` → still passes (the hook just calls this)
- `git commit` (dry run: `git commit --allow-empty -m "test"`) → hook
  fires and passes
- `npm run setup:hooks --uninstall` (dry run) → hook removed cleanly
- `node scripts/pre-commit-hook.cjs` invoked directly → exits 0
- `node scripts/pre-commit-hook.cjs` with a deliberately broken
  protocol (e.g. delete a tool entry file's AGENTS.md reference) →
  exits 1 with a clear message

---

**How to use this file**
- This is a starter template. The next agent should overwrite the body (keep the
  `# Auto` header) with a real plan when starting a non-trivial task.
- For trivial changes (typos, single-line tweaks), skip the plan and just commit.
- See `AGENTS.md` §6 for the full format spec and `AGENTS.md` §7 for the workflow.
