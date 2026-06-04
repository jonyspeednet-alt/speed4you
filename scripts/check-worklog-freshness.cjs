#!/usr/bin/env node
/*
 * Speed4You worklog freshness check
 * --------------------------------
 * Fails (exit 1) if the most recent entry in `worklog.md` is older than
 * `--max-age-days` (default 14) days.
 *
 * Used by the `protocol-check` CI job in `.github/workflows/deploy.yml`
 * to make sure the team's shared state (worklog, plan, todo) is being
 * kept up to date. See `AGENTS.md` §4 for the worklog format.
 *
 * Usage:
 *   node scripts/check-worklog-freshness.cjs
 *   node scripts/check-worklog-freshness.cjs --max-age-days=7
 *   node scripts/check-worklog-freshness.cjs --help
 *
 * Exit codes:
 *   0 — worklog is fresh
 *   1 — worklog is missing, empty, unparseable, or stale
 *   2 — bad arguments
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { maxAgeDays: 14, help: false, worklogPath: null };
  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') { out.help = true; continue; }
    const m = arg.match(/^--max-age-days=(\d+)$/);
    if (m) { out.maxAgeDays = Math.max(0, parseInt(m[1], 10)); continue; }
    if (arg.startsWith('--worklog=')) { out.worklogPath = arg.slice('--worklog='.length); continue; }
    process.stderr.write(`Unknown argument: ${arg}\n`);
    process.exit(2);
  }
  return out;
}

function showHelp() {
  process.stdout.write([
    'Usage: node scripts/check-worklog-freshness.cjs [options]',
    '',
    'Options:',
    '  --max-age-days=N   Max age of latest worklog entry in days (default 14)',
    '  --worklog=PATH     Path to worklog.md (default: ./worklog.md)',
    '  --help, -h         Show this help',
    '',
    'Exit codes:',
    '  0  worklog is fresh',
    '  1  worklog is missing, empty, unparseable, or stale',
    '  2  bad arguments',
    '',
    'See AGENTS.md §4 for the worklog format.',
    '',
  ].join('\n'));
}

function findLatestDate(worklog) {
  const re = /^Date:\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/m;
  const lines = worklog.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      const date = m[1];
      const time = m[2] || '00:00';
      const iso = `${date}T${time}:00`;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { showHelp(); return 0; }

  const worklogPath = args.worklogPath
    ? path.resolve(args.worklogPath)
    : path.resolve(__dirname, '..', 'worklog.md');

  if (!fs.existsSync(worklogPath)) {
    process.stderr.write(`FAIL: ${path.relative(process.cwd(), worklogPath)} does not exist\n`);
    return 1;
  }
  const content = fs.readFileSync(worklogPath, 'utf8');
  if (content.trim().length === 0) {
    process.stderr.write(`FAIL: ${path.relative(process.cwd(), worklogPath)} is empty\n`);
    return 1;
  }

  const latest = findLatestDate(content);
  if (!latest) {
    process.stderr.write(
      'FAIL: could not find a `Date: YYYY-MM-DD` line in worklog.md. ' +
      'See AGENTS.md §4 for the required format.\n'
    );
    return 1;
  }

  const now = new Date();
  const ageMs = now.getTime() - latest.getTime();
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  if (ageDays > args.maxAgeDays) {
    process.stderr.write(
      `FAIL: latest worklog entry is ${ageDays} day(s) old ` +
      `(${latest.toISOString().slice(0, 16)}), ` +
      `exceeds --max-age-days=${args.maxAgeDays}.\n` +
      `Either ship a change with a worklog entry, or update the threshold.\n`
    );
    return 1;
  }

  process.stdout.write(
    `OK — latest worklog entry is ${ageDays} day(s) old ` +
    `(${latest.toISOString().slice(0, 16)}), within ${args.maxAgeDays} day limit.\n`
  );
  return 0;
}

process.exit(main());
