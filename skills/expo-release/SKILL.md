---
name: expo-release
description: "Сборка и выпуск Expo-приложения для новичка: APK для друзей, AAB для Google Play, сборка для App Store и TestFlight, версии, обновления по воздуху (EAS Update), чек-лист перед публикацией. Используй, когда человек говорит «собери apk», «скинуть приложение другу», «выложить в Google Play», «опубликовать в App Store», «eas build», «сборка упала», «как обновить приложение», «eas update», «закрытое тестирование»."
---

# Сборка и релиз

Сначала проверь проект: `node "${CLAUDE_PLUGIN_ROOT}/scripts/expo-check.mjs" .` (`${CLAUDE_PLUGIN_ROOT}` — папка на два уровня выше «Base directory for this skill») — без `android.package`, `ios.bundleIdentifier`, иконки и `eas.json` дальше не идём.

## Что чем отличается (объясни, если спрашивают)

| Что | Для чего | Как поставить |
|---|---|---|
| Expo Go | Разработка | Код с компьютера, не отдельное приложение |
| APK | Дать другу на Android | Скачал файл → установил |
| AAB | Google Play | Только через консоль Play |
| IPA | iPhone | Только через TestFlight / App Store |

## 1. Подготовка (один раз)

```bash
npm install -g eas-cli
eas login          # аккаунт expo.dev
eas init           # привяжет проект, запишет projectId в app.json
eas build:configure
```

Приведи `eas.json` к виду:

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

Сохрани существующие поля проекта, если они уже есть.

## 2. APK для друзей

```bash
eas build --profile preview --platform android
```

Облачная сборка ~15–20 минут (на бесплатном плане бывает очередь). В конце — ссылка и QR: открыть на Android, скачать, разрешить установку из неизвестных источников.

## 3. Сборка упала

1. Открой ссылку на билд из терминала → вкладка с красным шагом → **первая** ошибка в логе.
2. Частые причины:
   - `npm ci` / версии пакетов → `npx expo install --fix`, закоммить lock-файл.
   - «Install dependencies» падает из-за lock-файла другого менеджера → оставь один lock-файл.
   - Ошибка в config plugin → проверь `plugins` в `app.json` и что пакет установлен.
   - Gradle / CocoaPods → `npx expo-doctor`, затем повтори с `--clear-cache`.
3. Проверь локально, что проект собирается: `npx expo export` (ловит ошибки JS без облака).

## 4. Google Play

Аккаунт разработчика — разовый взнос **$25** (play.google.com/console).

```bash
eas build --profile production --platform android   # AAB
```

Шаги в консоли: создать приложение → заполнить «Содержание приложения» (политика конфиденциальности, возрастной рейтинг, безопасность данных, реклама, целевая аудитория) → страница в магазине (иконка 512×512, баннер 1024×500, минимум 2 скриншота) → загрузить AAB в тестирование → отправить на проверку.

**Новые личные аккаунты:** перед выходом в «Рабочую версию» Google требует закрытое тестирование — минимум 12 тестировщиков 14 дней подряд. Предупреди об этом заранее: это две недели в плане.

Первый AAB загружай вручную через консоль. Дальше можно `eas submit -p android` (нужен JSON-ключ сервисного аккаунта). Подробно — `expo:eas-app-stores`.

## 5. App Store

Apple Developer Program — **$99 в год**. Нужен Apple ID с двухфакторной защитой.

```bash
eas build --profile production --platform ios   # EAS сам создаст сертификаты
eas submit -p ios                                # загрузит в App Store Connect
```

Сначала TestFlight (проверка Apple для внешних тестеров — обычно сутки), затем заявка в App Store: скриншоты под размеры iPhone, описание, политика конфиденциальности, данные для входа ревьюеру, если есть логин. Подробно — `expo:eas-app-stores`.

## 6. Обновления

- **Только JS-код и картинки** → по воздуху, без магазина:
  ```bash
  npx expo install expo-updates
  eas update:configure
  eas update --branch production --message "Исправил кнопку"
  ```
  Пользователи получат обновление при следующем запуске. Подробно — `expo:eas-update`.
- **Новая нативная библиотека, иконка, название, разрешения, SDK** → новая сборка и загрузка в магазин.
- Не выпускай всё разом: сначала маленькая версия с главной функцией, потом частями.

## Чек-лист перед публикацией

- [ ] `expo-check.mjs` без ❌, `npx expo-doctor` без ошибок.
- [ ] Название, иконка и сплэш свои, не шаблонные.
- [ ] `android.package` / `ios.bundleIdentifier` финальные (после загрузки не меняются).
- [ ] Production-сборка проверена на реальном телефоне (сначала `preview` APK).
- [ ] Все экраны прошли `expo-pack:expo-screen-quality`.
- [ ] Есть политика конфиденциальности по ссылке.
- [ ] Секретов в `EXPO_PUBLIC_*` нет.
- [ ] Цены аккаунтов и правила магазинов сверены с официальными страницами — они меняются.
