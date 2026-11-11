// node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const run = (fixture) => {
  const r = spawnSync('node', [join(root, 'scripts/expo-check.mjs'), join(root, 'tests/fixtures', fixture), '--json'], { encoding: 'utf8' });
  return { code: r.status, out: JSON.parse(r.stdout) };
};
const ids = (out) => out.results.map((r) => r.id);

test('правильный проект: без ошибок и предупреждений', () => {
  const { code, out } = run('good');
  assert.equal(code, 0);
  assert.equal(out.errors, 0);
  assert.equal(out.warnings, 0, JSON.stringify(out.results));
});

test('сломанный проект: ловит все известные проблемы', () => {
  const { code, out } = run('broken');
  assert.equal(code, 1);
  for (const id of ['expo-go-incompatible', 'no-slug', 'icon-missing', 'placeholder-android-package',
    'bad-ios-bundle', 'no-eas-project', 'preview-not-apk', 'no-autoincrement', 'many-locks',
    'env-not-ignored', 'public-secret', 'no-node-modules']) {
    assert.ok(ids(out).includes(id), `нет проверки ${id}`);
  }
  assert.ok(!ids(out).includes('public-secret') || out.results.find((r) => r.id === 'public-secret').msg.includes('SERVICE_ROLE'));
  assert.ok(!out.results.find((r) => r.id === 'public-secret').msg.includes('API_URL'), 'публичный URL не секрет');
});

test('не Expo-проект: код 2', () => {
  const { code, out } = run('not-expo');
  assert.equal(code, 2);
  assert.ok(ids(out).includes('not-expo'));
});
