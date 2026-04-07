import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';

import { emitLocalDataChanged, subscribeToLocalDataChanges } from '@/lib/local-events';
import {
  bindAnonymousDataToUser,
  clearLocalDataForSignOut,
  getLastSyncAt,
  getLocalSyncOverview,
  getPendingChangesCountForCurrentUser,
  isRemoteAccountEmpty,
  syncAllForCurrentUser,
} from '@/lib/sync';
import { getErrorMessage } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import type { SyncContextValue } from '@/types/sync';

export const SyncContext = createContext<SyncContextValue | null>(null);

const AUTO_SYNC_DELAY_MS = 1800;

export function SyncProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const promptedUserIdRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  const loadPendingCount = useCallback(async () => {
    if (!user || !isConfigured) {
      setPendingChangesCount(0);
      return;
    }

    try {
      const count = await getPendingChangesCountForCurrentUser();
      setPendingChangesCount(count);
    } catch {
      setPendingChangesCount(0);
    }
  }, [isConfigured, user]);

  const syncNow = useCallback(async () => {
    if (!user || !isConfigured || isSyncingRef.current) {
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await syncAllForCurrentUser();
      setLastSyncAt(result.finishedAt);
      await AsyncStorage.setItem(`plant-care:last-sync-status:${user.id}`, result.finishedAt);
      await loadPendingCount();
      return true;
    } catch (error) {
      setSyncError(getErrorMessage(error, 'Не удалось синхронизировать данные с облаком.'));
      await loadPendingCount();
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isConfigured, loadPendingCount, user]);

  const dismissSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  useEffect(() => {
    if (!user || authLoading || !isConfigured) {
      setLastSyncAt(null);
      setPendingChangesCount(0);
      setSyncError(null);
      promptedUserIdRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const storedLastSyncAt = await getLastSyncAt(user.id);

        if (!cancelled) {
          setLastSyncAt(storedLastSyncAt);
        }

        const overview = await getLocalSyncOverview(user.id);

        if (overview.hasForeignData) {
          await clearLocalDataForSignOut();
        }

        if (overview.hasAnonymousData && promptedUserIdRef.current !== user.id) {
          promptedUserIdRef.current = user.id;
          const remoteEmpty = await isRemoteAccountEmpty(user.id);

          if (remoteEmpty) {
            Alert.alert(
              'Перенести локальные данные в аккаунт?',
              'На устройстве уже есть локальные растения и задачи. Их можно загрузить в новый облачный аккаунт или начать с пустого облака.',
              [
                {
                  text: 'Начать с облака',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      await clearLocalDataForSignOut();
                      await loadPendingCount();
                      await syncNow();
                    })();
                  },
                },
                {
                  text: 'Загрузить данные',
                  onPress: () => {
                    void (async () => {
                      await bindAnonymousDataToUser(user.id);
                      emitLocalDataChanged();
                      await loadPendingCount();
                      await syncNow();
                    })();
                  },
                },
              ]
            );

            await loadPendingCount();
            return;
          }

          await bindAnonymousDataToUser(user.id);
        }

        await loadPendingCount();
        await syncNow();
      } catch (error) {
        if (!cancelled) {
          setSyncError(getErrorMessage(error, 'Не удалось подготовить синхронизацию.'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isConfigured, loadPendingCount, syncNow, user]);

  useEffect(() => {
    if (!user || !isConfigured) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeToLocalDataChanges(() => {
      void loadPendingCount();

      if (isSyncingRef.current) {
        return;
      }

      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        void syncNow();
      }, AUTO_SYNC_DELAY_MS);
    });

    return () => {
      unsubscribe();

      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isConfigured, loadPendingCount, syncNow, user]);

  const contextValue = useMemo<SyncContextValue>(
    () => ({
      isSyncing,
      lastSyncAt,
      syncError,
      pendingChangesCount,
      syncNow,
      dismissSyncError,
    }),
    [dismissSyncError, isSyncing, lastSyncAt, pendingChangesCount, syncError, syncNow]
  );

  return <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>;
}
