#!/usr/bin/env node
/**
 * check-***REMOVED***s.cjs
 *
 * Verifies that the ***REMOVED***s protocol is in place. NEVER prints a ***REMOVED*** value.
 * Only prints the names of files/variables and a pass/fail per check.
 *
 * Exit code 0 on success, 1 on any failure.
 *
 * Usage:
 *   node scripts/check-***REMOVED***s.cjs              # check everything
 *   node scripts/check-***REMOVED***s.cjs --required=DB_PASSWORD  # ensure a specific key is present
 *   node scripts/check-***REMOVED***s.cjs --help
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SECRETS = path.join(ROOT, '***REMOVED***s', 'local');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log([
    'Usage: node scripts/check-***REMOVED***s.cjs [options]',
    '',
    'Options:',
    '  --required=KEY    Exit non-zero if KEY is missing from the master .env',
    '  --help, -h        Show this help',
    '',
    'What is checked:',
    '  - ***REMOVED***s/README.md, ***REMOVED***s/.gitkeep, ***REMOVED***s/examples/ exist',
    '  - ***REMOVED***s/local/.env exists and is readable',
    '  - ***REMOVED***s/local/deploy_key exists, is readable, is a valid SSH key',
    '  - backend/.env exists and contains the required keys',
    '  - The required keys (see REQUIRED_KEYS below) are present in the master .env',
  ].join('\n'));
  process.exit(0);
}

const requiredFlag = args.find((a) => a.startsWith('--required='));
const requiredKey = requiredFlag ? requiredFlag.slice('--required='.length) : null;

const REQUIRED_KEYS = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'CORS_ALLOWED_ORIGINS',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
];

let errors = 0;
const pass = (m) => console.log(`  \u2713 ${m}`);
const fail = (m) => { errors++; console.log(`  \u2717 ${m}`); };
const info = (m) => console.log(`  - ${m}`);

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function readSafe(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

function parseEnv(text) {
  const out = {};
  if (!text) return out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function getMasterEnv() {
  const candidates = [
    path.join(SECRETS, '.env'),
    path.join(ROOT, '.env'),
    path.join(ROOT, '.env.deploy'),
  ];
  for (const p of candidates) {
    if (exists(p)) {
      const env = parseEnv(readSafe(p));
      if (Object.keys(env).length) return { path: p, env };
    }
  }
  return null;
}

console.log('\n[1/4] Protocol files ...');
['***REMOVED***s/README.md', '***REMOVED***s/.gitkeep', '***REMOVED***s/examples/'].forEach((rel) => {
  exists(path.join(ROOT, rel)) ? pass(rel) : fail(`${rel} is missing`);
});

console.log('\n[2/4] Master .env ...');
const master = getMasterEnv();
if (master) {
  pass(`found: ${path.relative(ROOT, master.path)} (${Object.keys(master.env).length} keys)`);
} else {
  fail('no master .env found at ***REMOVED***s/local/.env or project root');
}

if (master) {
  console.log('\n[3/4] Required keys in master .env ...');
  for (const k of REQUIRED_KEYS) {
    const v = master.env[k];
    if (!v) { fail(`missing: ${k}`); continue; }
    if (v === 'CHANGE_ME' || v.startsWith('CHANGE_ME_') || v.includes('PLACEHOLDER')) {
      fail(`${k} is still a placeholder value (${v})`);
    } else if (k === 'JWT_SECRET' && v.length < 32) {
      fail(`JWT_SECRET is too short (${v.length} chars; minimum 32)`);
    } else {
      pass(`${k} is set`);
    }
  }
}

console.log('\n[4/4] Backend .env + deploy key ...');
const backendEnv = path.join(ROOT, 'backend', '.env');
if (exists(backendEnv)) {
  const env = parseEnv(readSafe(backendEnv));
  info(`backend/.env: ${Object.keys(env).length} keys`);
  if (Object.keys(env).length === 0) fail('backend/.env is empty');
} else if (master) {
  fail('backend/.env missing — run `npm run ***REMOVED***s:setup` to generate it');
} else {
  fail('backend/.env missing and no master .env to generate it from');
}

const keyCandidates = [path.join(SECRETS, 'deploy_key'), path.join(ROOT, 'deploy_key')];
const keyPath = keyCandidates.find(exists);
if (keyPath) {
  const text = readSafe(keyPath) || '';
  if (text.includes('BEGIN OPENSSH PRIVATE KEY') || text.includes('BEGIN RSA PRIVATE KEY') || text.includes('BEGIN EC PRIVATE KEY')) {
    pass(`deploy_key: ${path.relative(ROOT, keyPath)} (valid SSH private key header)`);
    if (text.includes('PLACEHOLDER') || text.includes('DO_NOT_USE')) {
      fail('deploy_key looks like a template, not a real key');
    }
  } else {
    fail(`deploy_key: ${path.relative(ROOT, keyPath)} does not contain a valid SSH key header`);
  }
} else {
  fail('no deploy_key found at ***REMOVED***s/local/deploy_key or ./deploy_key — deploys will fail');
}

if (requiredKey) {
  console.log(`\n[extra] --required=${requiredKey} ...`);
  if (master && master.env[requiredKey] && !master.env[requiredKey].startsWith('CHANGE_ME')) {
    pass(`${requiredKey} is set in master .env`);
  } else {
    fail(`${requiredKey} is missing or unset`);
  }
}

console.log('');
if (errors === 0) {
  console.log('OK \u2014 every required ***REMOVED*** is in place.');
  console.log('     See AGENTS.md \u00a717 and docs/SECRETS.md for the full protocol.');
  process.exit(0);
} else {
  console.error(`FAIL \u2014 ${errors} problem(s) found. See AGENTS.md \u00a717 for how to fix.`);
  process.exit(1);
}
