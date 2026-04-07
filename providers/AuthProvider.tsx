import { AppState, type AppStateStatus } from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { clearLocalDataForSignOut } from '@/lib/sync';
import {
  ensureRemoteProfileAsync,
  formatSupabaseErrorMessage,
  getSupabaseClient,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import type { AuthContextValue, AuthCredentials, SignUpResult } from '@/types/auth';

export const AuthContext = createContext<AuthContextValue | null>(null);

function getConfigurationError() {
  return isSupabaseConfigured
    ? null
    : 'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      return;
    }

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    void (async () => {
      const {
        data: { session: nextSession },
      } = await client.auth.getSession();

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      previousUserIdRef.current = nextSession?.user.id ?? null;

      if (nextSession?.user) {
        try {
          await ensureRemoteProfileAsync(nextSession.user);
        } catch {
          // Не блокируем запуск приложения, если профиль временно не удалось синхронизировать.
        }
      }

      setLoading(false);
    })();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        void ensureRemoteProfileAsync(nextUser).catch(() => undefined);
      } else if (previousUserIdRef.current && !isSigningOutRef.current) {
        void clearLocalDataForSignOut().catch(() => undefined);
      }

      previousUserIdRef.current = nextUser?.id ?? null;
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }: AuthCredentials) => {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw new Error(formatSupabaseErrorMessage(error.message));
    }

    if (data.user) {
      await ensureRemoteProfileAsync(data.user);
    }
  }, []);

  const signUp = useCallback(
    async ({ email, password }: AuthCredentials): Promise<SignUpResult> => {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        throw new Error(formatSupabaseErrorMessage(error.message));
      }

      if (data.session?.user) {
        await ensureRemoteProfileAsync(data.session.user);
      }

      return {
        needsEmailConfirmation: !data.session,
      };
    },
    []
  );

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    isSigningOutRef.current = true;

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        throw new Error(formatSupabaseErrorMessage(error.message));
      }

      await clearLocalDataForSignOut();
    } finally {
      isSigningOutRef.current = false;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      return;
    }

    const {
      data: { session: nextSession },
    } = await supabase.auth.getSession();

    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      isConfigured: isSupabaseConfigured,
      configurationError: getConfigurationError(),
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [loading, refreshSession, session, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
