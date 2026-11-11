#!/usr/bin/env node
// Проверка Expo-проекта без сети и без зависимостей.
// Запуск: node expo-check.mjs [папка] [--json]
// Код выхода: 0 — ошибок нет, 1 — есть ошибки, 2 — не Expo-проект.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const results = [];
const add = (level, id, msg, fix = '') => results.push({ level, id, msg, fix });

// Библиотеки с нативным кодом, которых нет в Expo Go: нужна dev-сборка.
const NEEDS_DEV_BUILD = [
  'react-native-vision-camera', 'react-native-mmkv', 'react-native-iap',
  'react-native-purchases', 'react-native-google-mobile-ads', 'react-native-ble-plx',
  'react-native-health', 'react-native-nfc-manager', 'react-native-background-fetch',
  '@react-native-google-signin/google-signin', '@stripe/stripe-terminal-react-native',
  'onesignal-expo-plugin', 'react-native-onesignal', 'react-native-branch',
];
const NEEDS_DEV_BUILD_PREFIX = ['@react-native-firebase/', '@shopify/react-native-skia-'];

const readJson = (file) => {
  try { return JSON.parse(readFileSync(join(dir, file), 'utf8')); }
  catch { return undefined; }
};
const ID_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_-]*)+$/;
const PLACEHOLDER_RE = /^(com\.(example|anonymous|yourcompany|mycompany))\./i;

function checkPackage() {
  const pkg = readJson('package.json');
  if (!pkg) { add('error', 'no-package', 'Нет package.json или он битый', 'Открой папку проекта или создай его: npx create-expo-app@latest'); return null; }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps.expo) { add('error', 'not-expo', 'В зависимостях нет expo — это не Expo-проект', 'Для голого React Native этот плагин не нужен'); return null; }
  const sdk = Number(String(deps.expo).match(/(\d+)/)?.[1]);
  add('info', 'sdk', `Expo SDK ${sdk || '?'} (expo ${deps.expo})`);

  if (!existsSync(join(dir, 'node_modules'))) add('warn', 'no-node-modules', 'Зависимости не установлены', 'npm install');

  const locks = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock'].filter((f) => existsSync(join(dir, f)));
  if (locks.length > 1) add('warn', 'many-locks', `Несколько lock-файлов: ${locks.join(', ')}`, 'Оставь один менеджер пакетов, лишние lock-файлы удали');

  const hasDevClient = Boolean(deps['expo-dev-client']);
  const native = Object.keys(deps).filter((d) => NEEDS_DEV_BUILD.includes(d) || NEEDS_DEV_BUILD_PREFIX.some((p) => d.startsWith(p)));
  if (native.length && !hasDevClient) {
    add('error', 'expo-go-incompatible', `Не запустятся в Expo Go: ${native.join(', ')}`,
      'npx expo install expo-dev-client, затем eas build --profile development (или убери эти библиотеки)');
  } else if (native.length) {
    add('info', 'dev-build', `Нативные библиотеки (${native.join(', ')}) — запускай через dev-сборку, не Expo Go`);
  }
  if (hasDevClient) add('info', 'dev-client', 'Стоит expo-dev-client: npx expo start откроет dev-сборку; для Expo Go нажми s в терминале');
  return { pkg, deps, sdk };
}

function checkAppConfig() {
  const dynamic = ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs'].find((f) => existsSync(join(dir, f)));
  const appJson = readJson('app.json');
  if (dynamic && !appJson?.expo) {
    add('info', 'dynamic-config', `Конфиг в ${dynamic} — проверяю только статичную часть`, 'Полный итог покажет: npx expo config');
    return;
  }
  if (!appJson) { add('error', 'no-app-json', 'Нет app.json', 'Создай проект через npx create-expo-app@latest или добавь app.json'); return; }
  const c = appJson.expo ?? appJson;

  if (!c.name) add('error', 'no-name', 'Нет expo.name — название под иконкой', 'Добавь "name" в app.json');
  if (!c.slug) add('error', 'no-slug', 'Нет expo.slug', 'Добавь "slug" латиницей, без пробелов');
  if (!c.version) add('warn', 'no-version', 'Нет expo.version', 'Добавь "version": "1.0.0"');

  if (!c.icon) add('warn', 'no-icon', 'Нет иконки (expo.icon)', 'Добавь PNG 1024×1024 без прозрачности: "icon": "./assets/icon.png"');
  else if (!existsSync(join(dir, c.icon))) add('error', 'icon-missing', `Файл иконки не найден: ${c.icon}`, 'Исправь путь в app.json');

  const pkgId = c.android?.package;
  if (!pkgId) add('warn', 'no-android-package', 'Нет android.package — без него не собрать APK/AAB', 'Добавь, например: "android": { "package": "kg.myname.myapp" }');
  else if (!ID_RE.test(pkgId)) add('error', 'bad-android-package', `android.package "${pkgId}" некорректен`, 'Только латиница, цифры и _, минимум две части через точку');
  else if (PLACEHOLDER_RE.test(pkgId)) add('warn', 'placeholder-android-package', `android.package "${pkgId}" — шаблонный`, 'Поменяй до первой загрузки в Google Play: потом сменить нельзя');

  const bundle = c.ios?.bundleIdentifier;
  if (!bundle) add('warn', 'no-ios-bundle', 'Нет ios.bundleIdentifier — нужен для сборки под iPhone', 'Добавь: "ios": { "bundleIdentifier": "kg.myname.myapp" }');
  else if (!ID_RE.test(bundle)) add('error', 'bad-ios-bundle', `ios.bundleIdentifier "${bundle}" некорректен`, 'Латиница, цифры, точки и дефисы');

  if (!c.extra?.eas?.projectId) add('warn', 'no-eas-project', 'Проект не привязан к EAS', 'eas init (нужно для eas build и eas update)');
  if (!c.scheme) add('info', 'no-scheme', 'Нет expo.scheme — понадобится для ссылок вида myapp://', 'Добавь "scheme": "myapp", когда нужны deep links');
}

function checkEas() {
  const eas = readJson('eas.json');
  if (!existsSync(join(dir, 'eas.json'))) { add('warn', 'no-eas-json', 'Нет eas.json — облачная сборка не настроена', 'eas build:configure'); return; }
  if (!eas) { add('error', 'bad-eas-json', 'eas.json битый (ошибка JSON)', 'Проверь запятые и кавычки'); return; }
  const b = eas.build ?? {};
  for (const p of ['development', 'preview', 'production']) {
    if (!b[p]) add('info', `no-profile-${p}`, `В eas.json нет профиля ${p}`);
  }
  if (b.preview && b.preview.android?.buildType !== 'apk') {
    add('warn', 'preview-not-apk', 'Профиль preview соберёт AAB — его нельзя поставить на телефон напрямую',
      'Добавь в build.preview: "android": { "buildType": "apk" }');
  }
  if (b.production && !b.production.autoIncrement && eas.cli?.appVersionSource !== 'remote') {
    add('warn', 'no-autoincrement', 'Номер сборки не растёт сам — магазин отклонит повторную загрузку',
      'Добавь "cli": { "appVersionSource": "remote" } и в production "autoIncrement": true');
  }
}

function checkFilesystem() {
  const nativeDirs = ['ios', 'android'].filter((d) => existsSync(join(dir, d)));
  if (nativeDirs.length) {
    const ignore = existsSync(join(dir, '.gitignore')) ? readFileSync(join(dir, '.gitignore'), 'utf8') : '';
    const ignored = nativeDirs.every((d) => new RegExp(`^/?${d}/?$`, 'm').test(ignore));
    add('info', 'native-dirs', ignored
      ? `Папки ${nativeDirs.join(', ')} сгенерированы (в .gitignore): после правок app.json — npx expo prebuild --clean`
      : `Папки ${nativeDirs.join(', ')} в репозитории: правки app.json сами в них не попадут`);
  }

  const envFiles = readdirSync(dir).filter((f) => /^\.env(\..+)?$/.test(f) && f !== '.env.example');
  if (envFiles.length) {
    const ignore = existsSync(join(dir, '.gitignore')) ? readFileSync(join(dir, '.gitignore'), 'utf8') : '';
    if (!/^\.env/m.test(ignore)) add('error', 'env-not-ignored', `${envFiles.join(', ')} не в .gitignore`, 'Добавь строку .env* в .gitignore');
    for (const f of envFiles) {
      const secrets = readFileSync(join(dir, f), 'utf8').split('\n')
        .map((l) => l.match(/^\s*(EXPO_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|SERVICE_ROLE)[A-Z0-9_]*)\s*=/)?.[1])
        .filter(Boolean);
      if (secrets.length) add('error', 'public-secret', `${f}: ${secrets.join(', ')} попадут в приложение и их увидит любой`,
        'EXPO_PUBLIC_ — только для публичных ключей. Секреты держи на сервере');
    }
  }
}

const meta = checkPackage();
if (meta) { checkAppConfig(); checkEas(); checkFilesystem(); }

const errors = results.filter((r) => r.level === 'error').length;
const warns = results.filter((r) => r.level === 'warn').length;

if (asJson) {
  console.log(JSON.stringify({ dir, errors, warnings: warns, results }, null, 2));
} else {
  const icon = { error: '❌', warn: '⚠️ ', info: 'ℹ️ ' };
  console.log(`Проверка Expo-проекта: ${dir}\n`);
  for (const r of results) console.log(`${icon[r.level]} ${r.msg}${r.fix ? `\n   → ${r.fix}` : ''}`);
  console.log(`\nИтог: ошибок ${errors}, предупреждений ${warns}.` + (meta ? ' Ещё проверь совместимость версий: npx expo-doctor' : ''));
}
process.exit(meta ? (errors ? 1 : 0) : 2);
