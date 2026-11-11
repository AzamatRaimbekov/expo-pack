---
name: expo-run-on-phone
description: "Запуск Expo-приложения на реальном телефоне через Expo Go или dev-сборку и разбор ошибок подключения. Используй, когда человек говорит «запусти на телефоне», «QR не сканируется», «Could not connect to development server», «Project is incompatible with this version of Expo Go», «красный экран», «Unable to resolve module», «Cannot find native module», «бесконечная загрузка», «не видит компьютер», «туннель», «expo start не работает»."
---

# Запуск на телефоне и ошибки Expo Go

## Как это устроено (объясни новичку, если он запутался)

```
Компьютер                         Телефон
npx expo start → Metro ──Wi-Fi──→ Expo Go скачивает бандл
(собирает JS в бандл)             и рисует нативные экраны
```

Expo Go — готовое приложение из магазина. Твой код в него не «устанавливается»: Expo Go каждый раз берёт бандл у компьютера. Поэтому компьютер должен быть включён, а телефон — его видеть.

## Запуск

Подключается первый раз → веди по `expo-pack:expo-connect` (iPhone и Android). Компьютер не настроен → `expo-pack:expo-setup`.

1. Телефон: поставь **Expo Go** (Google Play / App Store).
2. Компьютер, в папке проекта: `npx expo start`
3. Android — сканируй QR **внутри Expo Go**. iPhone — сканируй **обычной камерой**, она предложит открыть в Expo Go.
4. Должен появиться экран загрузки с полоской, затем приложение. Правка в коде → телефон обновится сам за секунду (Fast Refresh).

Горячие клавиши в терминале: `r` — перезагрузить, `j` — отладчик, `s` — переключить Expo Go / dev-сборку, `m` — меню на телефоне.

## Ошибки: найди строку и сделай одно действие

| Видишь | Причина | Делай |
|---|---|---|
| `Could not connect to development server`, вечная загрузка, QR открывается и ничего | Телефон не видит компьютер: разные сети, гостевой Wi-Fi, VPN, файрвол | Одна сеть Wi-Fi, выключи VPN. Не помогло → `npx expo start --tunnel` |
| `--tunnel` просит поставить `@expo/ngrok` | Туннель нужен пакет | Согласись (y). Ошибка ngrok → перезапусти через минуту |
| `Project is incompatible with this version of Expo Go` | SDK проекта не совпадает с Expo Go на телефоне (Expo Go поддерживает только свежий SDK) | Обнови Expo Go. Проект старее → `expo:expo-upgrade`; новее Expo Go → дождись обновления Expo Go или dev-сборка |
| `Cannot find native module`, `TurboModuleRegistry... could not be found`, `Invariant Violation: ... has not been registered` | Библиотека с нативным кодом, которого нет в Expo Go | `npx expo install expo-dev-client`, `eas build --profile development`, ставь сборку на телефон |
| `Unable to resolve module X` | Пакет не установлен или опечатка в импорте | `npx expo install X`, затем `npx expo start -c` |
| Предупреждения `expected version ... found ...` | Версии пакетов не под SDK | `npx expo install --fix` |
| Красный экран с `TypeError` / `undefined is not ...` | Ошибка в твоём коде | Открой первую строку стека с путём из `app/` или `src/`, исправь там |
| Изменения не видны, «старый» экран | Кэш Metro | `npx expo start -c` |
| В Expo Go нет проекта в списке «Development servers» | Разные аккаунты в терминале и Expo Go | `npx expo whoami` и войди тем же аккаунтом в Expo Go (или просто сканируй QR) |
| iPhone: камера не реагирует на QR | Старый iOS или QR мелкий | Открой Expo Go → Scan QR code, или введи адрес `exp://...` из терминала вручную |
| Порт 8081 занят | Висит старый Metro | Закрой другие терминалы или `npx expo start --port 8082` |

Не нашлось в таблице → прочитай **первую** строку ошибки в терминале (не последнюю), найди её в `https://docs.expo.dev/troubleshooting/` и покажи человеку цитату.

## Dev-сборка вместо Expo Go

Когда: нативные библиотеки, свои иконка и название при тесте, push-уведомления, проверка как в магазине.

```bash
npx expo install expo-dev-client
eas build --profile development --platform android   # ~15–20 минут в облаке
```

Поставь APK по ссылке из терминала, затем `npx expo start` — QR откроется уже в твоей сборке. Пересобирать нужно только при смене нативных библиотек или `app.json`; JS-код обновляется как в Expo Go. Подробности — `expo:expo-dev-client`.

## Проверка готовности

- [ ] Приложение открылось на телефоне, а не только в эмуляторе.
- [ ] Правка текста видна на телефоне без перезапуска.
- [ ] В терминале нет красных ошибок и предупреждений о версиях.
