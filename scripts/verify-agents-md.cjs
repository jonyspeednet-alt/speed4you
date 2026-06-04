#!/usr/bin/env node
/**
 * verify-agents-md.cjs
 *
 * Sanity-checks the AI agent / model protocol on this repo.
 *
 * It does three things:
 *   1. Verifies the three shared state files exist and are non-empty:
 *      - AGENTS.md  (canonical operating manual)
 *      - worklog.md (append-only log)
 *      - plan.md    (active plan)
 *      - TODO.md    (master task list)
 *   2. Verifies that every per-tool entry file exists and is a thin pointer
 *      back to AGENTS.md (no duplicated rules).
 *   3. Verifies the .gitignore covers the agent-scratch patterns.
 *
 * Exit code 0 on success, 1 on any failure. Designed to be wired into
 * `npm run agent:check` and CI.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'AGENTS.md',
  'worklog.md',
  'plan.md',
  'TODO.md',
  'docs/AI_AGENTS.md',
  'docs/SECRETS.md',
  '***REMOVED***s/README.md',
  '***REMOVED***s/examples/.env.example',
  'scripts/setup-***REMOVED***s.cjs',
  'scripts/check-***REMOVED***s.cjs',
];

const TOOL_ENTRY_FILES = [
  'CLAUDE.md',
  '.cursorrules',
  '.cursor/rules/portal.mdc',
  '.github/copilot-instructions.md',
  '.github/instructions/speed4you.instructions.md',
  '.aider.conf.yml',
  '.kilocode/instructions.md',
  'GEMINI.md',
  '.windsurfrules',
  '.roo/rules/01-agents-md.md',
];

const GITIGNORE_MUST_CONTAIN = [
  '.scratch/',
  'scratch-*.md',
  '.task-*.md',
  '.agent-scratch/',
  '***REMOVED***s/local/',
  '!***REMOVED***s/README.md',
  '!***REMOVED***s/.gitkeep',
  '!***REMOVED***s/examples/',
];

let errors = 0;
const pass = (msg) => console.log(`  \u2713 ${msg}`);
const fail = (msg) => { errors++; console.log(`  \u2717 ${msg}`); };

function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function fileExistsAndNonEmpty(rel) {
  const content = readFile(rel);
  if (content === null) { fail(`${rel} is missing`); return null; }
  if (content.trim().length === 0) { fail(`${rel} is empty`); return null; }
  pass(`${rel} exists and is non-empty (${content.length} bytes)`);
  return content;
}

// Placeholder files like .gitkeep are intentionally empty but must exist.
const PLACEHOLDER_FILES = [
  '***REMOVED***s/.gitkeep',
];

function mentionsAgentsMd(rel) {
  const content = fileExistsAndNonEmpty(rel);
  if (content === null) return;
  if (!/AGENTS\.md/i.test(content)) {
    fail(`${rel} does not reference AGENTS.md`);
  } else {
    pass(`${rel} references AGENTS.md`);
  }
}

console.log('\n[1/4] Checking shared state files ...');
for (const f of REQUIRED_FILES) fileExistsAndNonEmpty(f);
for (const f of PLACEHOLDER_FILES) {
  if (readFile(f) === null) fail(`${f} is missing`);
  else pass(`${f} exists (placeholder, may be empty)`);
}

console.log('\n[2/4] Checking per-tool entry files (all must reference AGENTS.md) ...');
for (const f of TOOL_ENTRY_FILES) mentionsAgentsMd(f);

console.log('\n[3/4] Checking .gitignore covers agent-scratch patterns ...');
const gitignore = readFile('.gitignore');
if (gitignore === null) {
  fail('.gitignore is missing');
} else {
  for (const pat of GITIGNORE_MUST_CONTAIN) {
    if (!gitignore.includes(pat)) {
      fail(`.gitignore does not contain pattern: ${pat}`);
    } else {
      pass(`.gitignore covers: ${pat}`);
    }
  }
}

console.log('\n[4/4] Checking package.json exposes ***REMOVED***s:check and ***REMOVED***s:setup ...');
const pkg = JSON.parse(readFile('package.json') || '{}');
for (const s of ['***REMOVED***s:check', '***REMOVED***s:setup', 'agent:check']) {
  if (pkg.scripts && pkg.scripts[s]) pass(`npm run ${s} is defined`);
  else fail(`npm run ${s} is missing from package.json`);
}

console.log('');
if (errors === 0) {
  console.log('OK \u2014 every AI agent entry file and the three state files are in place.');
  console.log('     See AGENTS.md \u00a71\u20136 for the workflow.');
  process.exit(0);
} else {
  console.error(`FAIL \u2014 ${errors} problem(s) found. Fix the items above and re-run.`);
  process.exit(1);
}
