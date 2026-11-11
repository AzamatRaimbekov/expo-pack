#!/usr/bin/env node
// Связать телефон (iPhone или Android) с Expo-проектом через Expo Go.
// node connect-device.mjs [папка] [--json]           — проверить: проект, вход в Expo, сеть, порт
// node connect-device.mjs [папка] --start [--tunnel]  — открыть `npx expo start` в отдельном окне (macOS)
// Код выхода: 0 — можно подключать, 1 — есть что исправить, 2 — не Expo-проект.
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, networkInterfaces, platform, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { commandFile, parseWhoami, pickLan, portFree, printReport, readExpoUser } from './lib.mjs';

const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const asJson = args.includes('--json');
const steps = [];
const add = (level, msg, fix = '') => steps.push({ level, msg, fix });

function finish(data, code) {
  if (asJson) console.log(JSON.stringify({ dir, ...data, steps }, null, 2));
  else {
    const footer = data.ready ? [
      `Режим: ${data.mode === 'lan' ? 'одна сеть Wi-Fi' : 'туннель'}${data.url ? ` · адрес ${data.url}` : ''}`,
      'iPhone: Expo Go → тот же аккаунт → разрешить «Локальная сеть» → QR обычной камерой',
      'Android: Expo Go → тот же аккаунт → Scan QR code внутри Expo Go',
    ] : [];
    printReport(`Телефон ↔ проект: ${dir}`, steps, footer);
  }
  process.exitCode = code;
}

let pkg;
try { pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')); } catch { /* нет проекта */ }
const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
if (!deps.expo) {
  add('error', `В ${dir} нет Expo-проекта`, 'Перейди в папку проекта или создай его: npx create-expo-app@latest');
  finish({ ready: false }, 2);
} else {
  const sdk = String(deps.expo).match(/(\d+)/)?.[1] ?? '?';
  add('ok', `Expo-проект, SDK ${sdk}`);

  const hasModules = existsSync(join(dir, 'node_modules', 'expo'));
  if (!hasModules) add('error', 'Зависимости не установлены', 'npm install');
  if (deps['expo-dev-client']) add('info', 'Стоит expo-dev-client: QR откроет dev-сборку. Для Expo Go нажми s в окне expo start');

  // Тот же аккаунт в Expo Go — и проект сам появится в списке «Development servers».
  let user = process.env.EXPO_TOKEN ? '(EXPO_TOKEN)' : readExpoUser(homedir());
  if (!user && hasModules) {
    const r = spawnSync('npx', ['expo', 'whoami'], { cwd: dir, encoding: 'utf8', timeout: 60_000, env: { ...process.env, CI: '1' } });
    user = parseWhoami(r.status, r.stdout ?? '', r.stderr ?? '').user ?? null;
  }
  if (user) add('ok', `Вход в Expo: ${user}`, `В Expo Go на телефоне войди тем же аккаунтом (${user})`);
  else add('error', 'Не выполнен вход в аккаунт Expo', 'Человек сам: eas login или npx expo login. Нет аккаунта — https://expo.dev/signup');

  const { lan, vpn } = pickLan(networkInterfaces());
  const ip = lan[0]?.address;
  if (ip) add('ok', `Компьютер в сети: ${ip} (${lan[0].name})`, 'Телефон должен быть в этой же сети Wi-Fi');
  else add('warn', 'Не найден адрес в локальной сети', 'Подключись к Wi-Fi или запускай с --tunnel');
  if (vpn) add('warn', 'Включён VPN — телефон может не увидеть компьютер', 'Выключи VPN или запускай с --tunnel');
  if (lan.length > 1) add('info', `Несколько сетей: ${lan.map((l) => `${l.address} (${l.name})`).join(', ')}`, 'Не подключается — запусти с --tunnel');

  const busy = !(await portFree(8081));
  if (busy) add('info', 'Порт 8081 занят — похоже, expo start уже запущен', 'Если окно с QR открыто — сканируй его, второй запуск не нужен');

  const tunnel = args.includes('--tunnel') || !ip || vpn;
  const mode = tunnel ? 'tunnel' : 'lan';
  const url = !tunnel && ip ? `exp://${ip}:8081` : null;
  const ready = !steps.some((s) => s.level === 'error');
  const cmd = `npx expo start${tunnel ? ' --tunnel' : ''}`;

  let started = false;
  if (args.includes('--start') && ready && busy) {
    add('info', 'Не запускаю второй сервер: порт 8081 уже занят');
  } else if (args.includes('--start') && ready) {
    if (platform() === 'darwin') {
      // .command открывается в Терминале без запроса прав на автоматизацию (в отличие от osascript).
      const file = join(tmpdir(), 'expo-pack-start.command');
      writeFileSync(file, commandFile(dir, tunnel));
      chmodSync(file, 0o755);
      started = spawnSync('open', ['-a', 'Terminal', file], { timeout: 15_000 }).status === 0;
      if (started) add('ok', `Открыл окно Терминала: ${cmd} — через ~10 секунд там появится QR-код`);
      else add('error', 'Не удалось открыть Терминал', `Запусти вручную в отдельном окне: cd "${dir}" && ${cmd}`);
    } else {
      add('info', 'Автозапуск окна есть только на macOS', `Запусти в отдельном окне терминала: ${cmd}`);
    }
  }
  finish({ sdk, ready, user, ip: ip ?? null, vpn, mode, url, started }, ready ? 0 : 1);
}
