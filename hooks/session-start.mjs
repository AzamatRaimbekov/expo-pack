// Сообщает агенту, что открыт Expo-проект. Молчит в остальных папках.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

try {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.expo) {
    const sdk = String(deps.expo).match(/(\d+)/)?.[1] ?? '?';
    console.log(
      `[expo-pack] Это Expo-проект (SDK ${sdk}). Для задач по приложению загрузи скилл expo-pack:expo; подключить телефон — expo-pack:expo-connect; ` +
      'проверка проекта: node "${CLAUDE_PLUGIN_ROOT}/scripts/expo-check.mjs" .'.replace('${CLAUDE_PLUGIN_ROOT}', process.env.CLAUDE_PLUGIN_ROOT ?? '<plugin>')
    );
  }
} catch {
  // нет package.json или он битый — это не Expo-проект, молчим
}
