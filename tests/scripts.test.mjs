import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const run = (script, ...a) => {
  const r = spawnSync('node', [join(root, 'scripts', script), ...a, '--json'], { encoding: 'utf8' });
  return { code: r.status, out: JSON.parse(r.stdout) };
};

test('connect-device: не Expo-проект — код 2', () => {
  const { code, out } = run('connect-device.mjs', join(root, 'tests/fixtures/not-expo'));
  assert.equal(code, 2);
  assert.equal(out.ready, false);
});

test('connect-device: без node_modules — ошибка с npm install', () => {
  const { code, out } = run('connect-device.mjs', join(root, 'tests/fixtures/broken'));
  assert.equal(code, 1);
  assert.ok(out.steps.some((s) => s.fix === 'npm install'));
});

test('setup-check: выдаёт отчёт по Node, npm, git, входу', () => {
  const { out } = run('setup-check.mjs');
  const text = out.steps.map((s) => s.msg).join('\n');
  for (const word of ['Node', 'npm', 'git', 'Expo']) assert.match(text, new RegExp(word));
  assert.equal(typeof out.ready, 'boolean');
});
