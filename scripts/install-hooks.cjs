#!/usr/bin/env node
/*
 * Speed4You pre-commit hook installer
 * ------------------------------------
 * Copies `scripts/pre-commit-hook.cjs` into the active git hooks
 * directory and (on POSIX) makes it executable. Supports:
 *
 *   node scripts/install-hooks.cjs           # install
 *   node scripts/install-hooks.cjs --force   # overwrite existing pre-commit
 *   node scripts/install-hooks.cjs --uninstall
 *   node scripts/install-hooks.cjs --help
 *
 * The hooks directory is resolved in this order:
 *   1. `git config core.hooksPath` (if set)
 *   2. `<repo>/.git/hooks` (the default)
 *
 * On POSIX, the installer sets mode 0755. On Windows, the executable
 * bit is irrelevant; git will run the hook via the shebang line.
 *
 * If a `pre-commit` hook already exists and `--force` is not set, the
 * installer backs it up to `pre-commit.bak.<timestamp>` and refuses
 * to overwrite. Pass `--force` to overwrite anyway.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK_SOURCE = path.join(__dirname, 'pre-commit-hook.cjs');
const HOOK_NAME = 'pre-commit';

function parseArgs(argv) {
  const out = { force: false, uninstall: false, help: false };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--force') out.force = true;
    else if (a === '--uninstall') out.uninstall = true;
    else {
      process.stderr.write(`Unknown argument: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

function showHelp() {
  process.stdout.write([
    'Usage: node scripts/install-hooks.cjs [options]',
    '',
    'Options:',
    '  --force        Overwrite an existing pre-commit hook',
    '  --uninstall    Remove the installed hook and restore the backup',
    '  --help, -h     Show this help',
    '',
    'What it does:',
    '  Installs scripts/pre-commit-hook.cjs into the git hooks directory',
    '  (default .git/hooks, or core.hooksPath if set). The hook runs',
    '  `npm run agent:check` before every commit.',
    '',
    'Run `npm run setup:hooks` to install, `npm run uninstall:hooks` to remove.',
    '',
  ].join('\n'));
}

function getHooksDir() {
  let r = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (r.status === 0 && r.stdout && r.stdout.trim()) {
    const p = r.stdout.trim();
    return path.isAbsolute(p) ? p : path.resolve(REPO_ROOT, p);
  }
  return path.join(REPO_ROOT, '.git', 'hooks');
}

function isPosix() {
  return process.platform !== 'win32';
}

function chmod755(p) {
  if (!isPosix()) return;
  try {
    fs.chmodSync(p, 0o755);
  } catch (err) {
    process.stderr.write(`WARN: could not chmod 755 ${p}: ${err.message}\n`);
  }
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function install(hooksDir, force) {
  if (!fs.existsSync(HOOK_SOURCE)) {
    process.stderr.write(`FAIL: hook source not found: ${HOOK_SOURCE}\n`);
    return 1;
  }
  fs.mkdirSync(hooksDir, { recursive: true });
  const dest = path.join(hooksDir, HOOK_NAME);

  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf8');
    if (existing.indexOf('Speed4You pre-commit hook') !== -1) {
      // It's our hook. Compare to the source so we auto-update when the
      // source changes (e.g. after a git pull that touched the protocol).
      const sourceContent = fs.readFileSync(HOOK_SOURCE, 'utf8');
      const shebang = '#!/usr/bin/env node\n';
      const expected = sourceContent.startsWith('#!') ? sourceContent : (shebang + sourceContent);
      if (existing === expected) {
        process.stdout.write(`OK — ${path.relative(REPO_ROOT, dest)} is up to date. Nothing to do.\n`);
        return 0;
      }
      process.stdout.write(`Source changed; updating ${path.relative(REPO_ROOT, dest)} ...\n`);
      // fall through to write the new content
    } else if (!force) {
      const bak = `${dest}.bak.${timestamp()}`;
      fs.renameSync(dest, bak);
      process.stdout.write(`Existing pre-commit hook saved to: ${path.relative(REPO_ROOT, bak)}\n`);
      process.stdout.write(`Re-run with --force to overwrite without backing up.\n`);
      return 0;
    }
  }

  const sourceContent = fs.readFileSync(HOOK_SOURCE, 'utf8');
  const shebang = '#!/usr/bin/env node\n';
  const body = sourceContent.startsWith('#!') ? sourceContent : (shebang + sourceContent);
  fs.writeFileSync(dest, body);
  chmod755(dest);
  process.stdout.write(`Installed: ${path.relative(REPO_ROOT, dest)}\n`);
  process.stdout.write(`Test it:   node ${path.relative(REPO_ROOT, dest)}\n`);
  return 0;
}

function uninstall(hooksDir) {
  const dest = path.join(hooksDir, HOOK_NAME);
  if (!fs.existsSync(dest)) {
    process.stdout.write(`Nothing to uninstall at ${path.relative(REPO_ROOT, dest)}.\n`);
    return 0;
  }
  const existing = fs.readFileSync(dest, 'utf8');
  if (existing.indexOf('Speed4You pre-commit hook') === -1) {
    process.stdout.write(
      `Refusing to remove ${path.relative(REPO_ROOT, dest)}: not a Speed4You hook.\n` +
      `Remove it manually if you really want to.\n`
    );
    return 1;
  }
  fs.unlinkSync(dest);
  process.stdout.write(`Removed: ${path.relative(REPO_ROOT, dest)}\n`);

  // Restore the most recent backup if one exists
  const dir = path.dirname(dest);
  const backups = fs.readdirSync(dir)
    .filter((f) => f.startsWith(HOOK_NAME + '.bak.'))
    .sort()
    .reverse();
  if (backups.length > 0) {
    const latest = backups[0];
    fs.renameSync(path.join(dir, latest), dest);
    chmod755(dest);
    process.stdout.write(`Restored backup: ${latest}\n`);
  }
  return 0;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { showHelp(); return 0; }

  let hooksDir;
  try {
    hooksDir = getHooksDir();
  } catch (err) {
    process.stderr.write(`FAIL: could not resolve git hooks directory: ${err.message}\n`);
    return 1;
  }

  process.stdout.write(`hooks dir: ${path.relative(REPO_ROOT, hooksDir)}\n`);
  return args.uninstall ? uninstall(hooksDir) : install(hooksDir, args.force);
}

process.exit(main());
