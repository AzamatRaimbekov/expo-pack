// Общие функции скриптов expo-pack. Без зависимостей.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

const PRIVATE_RE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
const VPN_RE = /^(utun|tun|tap|ppp|wg|ipsec|gpd)/;
const WIFI_RE = /^(en\d|wlan\d|wlp)/;

/** Адреса компьютера в локальной сети и признак VPN. */
export function pickLan(ifaces) {
  const lan = [];
  let vpn = false;
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal || a.address.startsWith('169.254.')) continue;
      if (VPN_RE.test(name)) { vpn = true; continue; }
      if (PRIVATE_RE.test(a.address)) lan.push({ name, address: a.address });
    }
  }
  lan.sort((x, y) => Number(WIFI_RE.test(y.name)) - Number(WIFI_RE.test(x.name)));
  return { lan, vpn };
}

/** Разбор вывода `expo whoami`. */
export function parseWhoami(code, stdout, stderr) {
  const out = `${stdout}\n${stderr}`;
  if (/not logged in/i.test(out)) return { loggedIn: false };
  const user = stdout.trim().split('\n').pop()?.trim();
  if (code === 0 && user && /^[\w.@+-]+$/.test(user)) return { loggedIn: true, user };
  return { loggedIn: false, error: out.trim().split('\n').slice(-3).join(' ') };
}

/** Текст .command-файла: macOS открывает его в Терминале без разрешений на автоматизацию. */
export function commandFile(dir, tunnel) {
  const shellDir = `'${dir.replace(/'/g, `'\\''`)}'`;
  return `#!/bin/zsh -l\ncd ${shellDir} || exit 1\nnpx expo start${tunnel ? ' --tunnel' : ''}\n`;
}

export const portFree = (port) => new Promise((done) => {
  const srv = createServer().once('error', () => done(false))
    .once('listening', () => srv.close(() => done(true)));
  srv.listen(port, '0.0.0.0');
});

/** Логин Expo из ~/.expo/state.json (его пишут expo login и eas login). Секрет не читаем наружу. */
export function readExpoUser(home) {
  try {
    const s = JSON.parse(readFileSync(join(home, '.expo', 'state.json'), 'utf8'));
    return s.auth?.username && s.auth?.sessionSecret ? s.auth.username : null;
  } catch { return null; }
}

/** Проверка версии Node по диапазону вида "^22.13.0 || ^24.3.0 || >=26.0.0". */
export function satisfiesNode(version, range) {
  const v = version.replace(/^v/, '').split('.').map(Number);
  const cmp = (x, y) => (x[0] - y[0]) || ((x[1] ?? 0) - (y[1] ?? 0)) || ((x[2] ?? 0) - (y[2] ?? 0));
  return range.split('||').map((r) => r.trim()).some((r) => {
    const m = r.match(/^(\^|>=)\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
    if (!m) return false;
    const want = [m[2], m[3], m[4]].map((n) => Number(n ?? 0));
    return m[1] === '^' ? v[0] === want[0] && cmp(v, want) >= 0 : cmp(v, want) >= 0;
  });
}

/** Версия программы или null, если её нет. */
export function toolVersion(cmd, args = ['--version']) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 20_000 });
  return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
}

export function printReport(title, steps, footer = []) {
  const icon = { ok: '✅', error: '❌', warn: '⚠️ ', info: 'ℹ️ ' };
  console.log(`${title}\n`);
  for (const s of steps) console.log(`${icon[s.level]} ${s.msg}${s.fix ? `\n   → ${s.fix}` : ''}`);
  if (footer.length) console.log(`\n${footer.join('\n')}`);
}
