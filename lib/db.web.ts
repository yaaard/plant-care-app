type UnsupportedDatabase = never;

const WEB_UNSUPPORTED_MESSAGE =
  'Веб-версия не поддерживается. Приложение рассчитано на Android и iOS через Expo.';

export async function getDatabase(): Promise<UnsupportedDatabase> {
  throw new Error(WEB_UNSUPPORTED_MESSAGE);
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIsoString(): string {
  return new Date().toISOString();
}

export { WEB_UNSUPPORTED_MESSAGE };
