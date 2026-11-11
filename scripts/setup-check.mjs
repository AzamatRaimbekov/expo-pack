#!/usr/bin/env node
// Готов ли компьютер к Expo: Node, npm, git, аккаунт Expo, EAS CLI, сеть.
// node setup-check.mjs [папка проекта] [--json]
// Код выхода: 0 — всё готово для Expo Go, 1 — есть что поставить или настроить.
import { existsSync, readFileSync } from 'node:fs';
import { homedir, networkInterfaces, platform, release } from 'node:os';
import { join, resolve } from 'node:path';
import { pickLan, printReport, readExpoUser, satisfiesNode, toolVersion } from './lib.mjs';

// Требование свежего Expo SDK; если есть проект — берём точное из его node_modules/expo.
const DEFAULT_NODE_RANGE = '^22.13.0 || ^24.3.0 || >=26.0.0';
const OS_NAME = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' };

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const os = platform();
const steps = [];
const add = (level, msg, fix = '') => steps.push({ level, msg, fix });

add('info', `Система: ${OS_NAME[os] ?? os} (${release()})`);

let nodeRange = DEFAULT_NODE_RANGE;
try {
  const engines = JSON.parse(readFileSync(join(dir, 'node_modules', 'expo', 'package.json'), 'utf8')).engines;
  if (engines?.node) nodeRange = engines.node;
} catch { /* проекта нет — берём требование по умолчанию */ }

const nodeFix = os === 'darwin'
  ? 'Скачай LTS-установщик с https://nodejs.org (кнопка LTS) и установи, затем открой новое окно терминала'
  : os === 'win32' ? 'Скачай LTS-установщик с https://nodejs.org, установи с галочкой «Add to PATH», перезапусти терминал'
    : 'Поставь Node LTS через nvm: https://github.com/nvm-sh/nvm, затем nvm install --lts';
if (satisfiesNode(process.version, nodeRange)) add('ok', `Node ${process.version}`);
else add('error', `Node ${process.version} не подходит Expo (нужно ${nodeRange})`, nodeFix);

const npm = toolVersion(os === 'win32' ? 'npm.cmd' : 'npm', ['-v']);
if (npm) add('ok', `npm ${npm}`);
else add('error', 'npm не найден', nodeFix);

const git = toolVersion('git');
if (git) add('ok', git);
else add('error', 'git не найден — create-expo-app и EAS его используют',
  os === 'darwin' ? 'xcode-select --install (поставит git и инструменты командной строки)' : 'Установи с https://git-scm.com');

if (os === 'darwin') {
  if (toolVersion('watchman')) add('ok', 'watchman установлен');
  else add('info', 'watchman не установлен — Expo работает и без него, но с ним быстрее следит за файлами',
    'По желанию: brew install watchman (нужен Homebrew: https://brew.sh)');
}

const eas = toolVersion(os === 'win32' ? 'eas.cmd' : 'eas');
if (eas) add('ok', `EAS CLI: ${eas}`);
else add('warn', 'EAS CLI не установлен — нужен для входа, сборок APK и публикации', 'npm install -g eas-cli');

const user = readExpoUser(homedir());
if (user) add('ok', `Вход в аккаунт Expo: ${user}`, `В Expo Go на телефоне войди тем же аккаунтом (${user})`);
else add('error', 'Не выполнен вход в аккаунт Expo',
  'Человек сам: зарегистрируйся на https://expo.dev/signup, затем в терминале eas login (или npx expo login). Пароль в чат не пиши');

const { lan, vpn } = pickLan(networkInterfaces());
if (lan[0]) add('ok', `Сеть: ${lan[0].address} (${lan[0].name})`, 'Телефон подключай к этой же сети Wi-Fi');
else add('warn', 'Компьютер не в локальной сети', 'Подключись к Wi-Fi; иначе телефон подключится только через туннель (--tunnel)');
if (vpn) add('warn', 'Включён VPN — телефон может не увидеть компьютер', 'Выключи VPN на время разработки или используй --tunnel');

// Не нужно для Expo Go, но пригодится позже.
if (os === 'darwin') {
  add('info', existsSync('/Applications/Xcode.app') ? 'Xcode есть — можно запускать iOS-симулятор (клавиша i)' : 'Xcode нет — для Expo Go на iPhone он не нужен');
}
const adb = toolVersion('adb', ['version']);
add('info', adb ? 'Android SDK (adb) есть — можно запускать эмулятор (клавиша a)' : 'Android Studio нет — для Expo Go на Android-телефоне он не нужен');

const errors = steps.filter((s) => s.level === 'error').length;
if (asJson) console.log(JSON.stringify({ ready: errors === 0, user, nodeRange, steps }, null, 2));
else printReport('Готов ли компьютер к Expo', steps,
  [errors ? `Исправь ❌ (${errors}) и запусти проверку снова.` : 'Компьютер готов. Дальше: создать проект и подключить телефон.']);
process.exitCode = errors ? 1 : 0;
