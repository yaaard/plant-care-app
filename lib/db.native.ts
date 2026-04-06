import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME } from '@/constants/defaultValues';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await openDatabaseAsync(DATABASE_NAME);
      await database.execAsync('PRAGMA foreign_keys = ON;');
      return database;
    })();
  }

  return databasePromise;
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIsoString(): string {
  return new Date().toISOString();
}
