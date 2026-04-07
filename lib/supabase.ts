import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        storage: AsyncStorage as never,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  return supabase;
}

export async function getCurrentSupabaseUserIdAsync(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user.id ?? null;
}

export async function ensureRemoteProfileAsync(user: User) {
  const client = getSupabaseClient();

  const { error } = await client.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    throw error;
  }
}

export function formatSupabaseErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('email not confirmed')
  ) {
    return normalized.includes('email not confirmed')
      ? 'Подтвердите email перед входом в приложение.'
      : 'Неверный email или пароль.';
  }

  if (normalized.includes('user already registered')) {
    return 'Пользователь с таким email уже существует.';
  }

  if (
    normalized.includes('password should be at least') ||
    normalized.includes('password should be')
  ) {
    return 'Пароль должен содержать минимум 6 символов.';
  }

  if (normalized.includes('invalid email') || normalized.includes('unable to validate email')) {
    return 'Введите корректный email.';
  }

  if (
    normalized.includes('network request failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed')
  ) {
    return 'Не удалось подключиться к интернету. Проверьте сеть и попробуйте снова.';
  }

  return message;
}
