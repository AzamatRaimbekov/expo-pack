import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { commandFile, parseWhoami, pickLan, readExpoUser, satisfiesNode } from '../scripts/lib.mjs';

const v4 = (address, internal = false) => ({ family: 'IPv4', address, internal });

test('pickLan: Wi-Fi первым, loopback и link-local мимо, VPN замечен', () => {
  const r = pickLan({ lo0: [v4('127.0.0.1', true)], bridge100: [v4('10.0.0.5')], en0: [v4('192.168.1.20')], en5: [v4('169.254.3.3')], utun3: [v4('10.8.0.2')] });
  assert.equal(r.lan[0].address, '192.168.1.20');
  assert.equal(r.lan.length, 2);
  assert.equal(r.vpn, true);
});

test('pickLan: utun только с IPv6 (iCloud) — не VPN', () => {
  assert.equal(pickLan({ utun0: [{ family: 'IPv6', address: 'fe80::1', internal: false }] }).vpn, false);
});

test('parseWhoami', () => {
  assert.deepEqual(parseWhoami(0, 'azamat\n', ''), { loggedIn: true, user: 'azamat' });
  assert.equal(parseWhoami(1, '', 'Not logged in').loggedIn, false);
});

test('satisfiesNode по диапазону Expo SDK 58', () => {
  const range = '^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0';
  for (const ok of ['v22.13.0', 'v22.23.0', 'v24.3.0', 'v26.1.0', 'v28.0.0']) assert.ok(satisfiesNode(ok, range), ok);
  for (const bad of ['v20.19.4', 'v22.12.9', 'v23.5.0', 'v24.2.0']) assert.ok(!satisfiesNode(bad, range), bad);
});

test('readExpoUser: есть вход / нет входа / нет файла', () => {
  const home = mkdtempSync(join(tmpdir(), 'expo-home-'));
  assert.equal(readExpoUser(home), null);
  mkdirSync(join(home, '.expo'));
  writeFileSync(join(home, '.expo', 'state.json'), JSON.stringify({ auth: { username: 'kid', sessionSecret: 's' } }));
  assert.equal(readExpoUser(home), 'kid');
  writeFileSync(join(home, '.expo', 'state.json'), JSON.stringify({ auth: null }));
  assert.equal(readExpoUser(home), null);
});

test('commandFile: путь с кириллицей, пробелом и апострофом', () => {
  const dir = "/Users/a/Мой проект/it's";
  const body = commandFile(dir, true);
  assert.match(body, /npx expo start --tunnel/);
  assert.equal(spawnSync('zsh', ['-n', '-c', body]).status, 0);
  const line = body.split('\n')[1].replace(/^cd /, 'print -r -- ').replace(' || exit 1', '');
  assert.equal(spawnSync('zsh', ['-c', line], { encoding: 'utf8' }).stdout.trim(), dir);
});
