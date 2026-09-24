const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDfOutput, statusForUsePercent, formatBytes, getDiskHealth } = require('../src/utils/disk-health');

test('parseDfOutput parses POSIX df output', () => {
  const output = 'Filesystem 1024-blocks Used Available Capacity Mounted on\n'
    + '/dev/mapper/ubuntu--vg-ubuntu--lv 111331328 44040192 61554688 42% /\n';
  assert.deepEqual(parseDfOutput(output), {
    totalBytes: 111331328 * 1024,
    usedBytes: 44040192 * 1024,
    freeBytes: 61554688 * 1024,
    usePercent: 42,
  });
});

test('parseDfOutput returns null for garbage', () => {
  assert.equal(parseDfOutput(''), null);
  assert.equal(parseDfOutput('only-one-line'), null);
  assert.equal(parseDfOutput('a b c\nd e f'), null);
});

test('statusForUsePercent applies default thresholds (warn 85, crit 93)', () => {
  assert.equal(statusForUsePercent(40), 'ok');
  assert.equal(statusForUsePercent(84.9), 'ok');
  assert.equal(statusForUsePercent(85), 'warning');
  assert.equal(statusForUsePercent(92), 'warning');
  assert.equal(statusForUsePercent(93), 'critical');
  assert.equal(statusForUsePercent(Number.NaN), 'unknown');
});

test('formatBytes renders human sizes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(61 * 1024 ** 3), '61.0 GB');
  assert.equal(formatBytes(Number.NaN), '—');
});

test('getDiskHealth returns a shaped object (unknown allowed off-Linux)', () => {
  const health = getDiskHealth();
  assert.equal(health.path, '/');
  assert.ok(['ok', 'warning', 'critical', 'unknown'].includes(health.status));
  if (health.status !== 'unknown') {
    assert.ok(Number.isFinite(health.usePercent));
    assert.ok(Number.isFinite(health.freeBytes));
  }
});
