#!/usr/bin/env node
/*
 * Speed4You pre-commit hook
 * -------------------------
 * Runs `npm run agent:check` before every commit. If the check fails,
 * the commit is rejected with a clear message and a hint on how to
 * bypass (`git commit --no-verify`) or fix the protocol.
 *
 * Installed by `scripts/install-hooks.cjs` (npm run setup:hooks).
 * Removed by `npm run uninstall:hooks`.
 *
 * This script intentionally runs ONLY `agent:check`, not
 * `worklog:check`. The worklog is updated as part of the commit, so a
 * worklog freshness check at pre-commit time is unreliable. The
 * worklog freshness is enforced by the `protocol-check` CI job in
 * `.github/workflows/deploy.yml`.
 *
 * Exit codes:
 *   0 — protocol check passed, allow the commit
 *   1 — protocol check failed, reject the commit
 *   2 — could not run npm (e.g. not on PATH); fail closed
 */

const { spawnSync } = require('child_process');

function run(cmd, args, opts) {
  // `shell: true` is required on Windows so that `spawnSync('npm', ...)`
  // can find `npm.cmd` (the shim lives next to `node.exe` and is not
  // picked up by the default CreateProcess search on Win32). On POSIX
  // it is a no-op for our use case.
  const r = spawnSync(cmd, args, Object.assign({ stdio: 'inherit', shell: true }, opts || {}));
  return r;
}

function main() {
  process.stdout.write('[pre-commit] running npm run agent:check ...\n');
  const r = run('npm', ['run', 'agent:check', '--silent'], { cwd: process.cwd() });

  if (r.error) {
    process.stderr.write(
      '[pre-commit] could not run npm: ' + r.error.message + '\n' +
      '[pre-commit] install Node + npm and try again, or use `git commit --no-verify`.\n'
    );
    return 2;
  }
  if (typeof r.status !== 'number') {
    process.stderr.write('[pre-commit] npm exited abnormally; failing closed.\n');
    return 2;
  }
  if (r.status === 0) {
    process.stdout.write('[pre-commit] OK — protocol is intact. Proceeding with commit.\n');
    return 0;
  }
  process.stderr.write(
    '\n[pre-commit] FAIL — `npm run agent:check` exited with code ' + r.status + '.\n' +
    '[pre-commit] The AI agent protocol is broken or drifted. See the output above.\n' +
    '[pre-commit] Fix it, or bypass with:  git commit --no-verify\n' +
    '[pre-commit] (See AGENTS.md §3 and §7 for what the check expects.)\n'
  );
  return 1;
}

process.exit(main());
