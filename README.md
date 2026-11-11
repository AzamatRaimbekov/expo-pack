# expo-pack

Плагин Claude Code для первого мобильного приложения на Expo. Работает поверх официального `expo@claude-plugins-official`: тот знает API, этот ведёт новичка по шагам.

| Скилл | Что делает |
|---|---|
| `expo-setup` | **Главное для новичка:** настройка компьютера с нуля → аккаунт Expo → проект → телефон |
| `expo-connect` | Связать iPhone или Android с проектом через Expo Go, запуск `expo start` в отдельном окне |
| `expo` | Вход: проверка проекта, новый проект, маршрут к нужному скиллу |
| `expo-run-on-phone` | Запуск через Expo Go, таблица ошибок подключения и их исправлений |
| `expo-screen-quality` | Осмотр экрана: 4 состояния, 60 FPS, клавиатура, вырезы, тёмная тема |
| `expo-release` | APK, Google Play, App Store, EAS Update, чек-лист перед публикацией |

`scripts/setup-check.mjs` проверяет компьютер (Node под требования Expo, npm, git, EAS CLI, вход в Expo, сеть). `scripts/connect-device.mjs` готовит подключение телефона и открывает `expo start` в Терминале. `scripts/expo-check.mjs` проверяет проект без сети: app.json, eas.json, библиотеки, которых нет в Expo Go, секреты в `EXPO_PUBLIC_*`. Хук SessionStart подсказывает агенту, что открыт Expo-проект.

## Установка

В Claude Code:

```
/plugin marketplace add AzamatRaimbekov/expo-pack
/plugin install expo-pack@expo-pack
/plugin install expo@claude-plugins-official
```

Последняя строка ставит официальный плагин Expo: expo-pack ссылается на его скиллы (`expo:*`).
Потом откройте новую сессию и скажите агенту: «Настрой Expo с нуля и подключи мой телефон».

Обновить плагин: `/plugin marketplace update expo-pack`.

## Проверка

```
node --test tests/*.test.mjs
node scripts/expo-check.mjs <папка проекта>
claude plugin validate .
```
