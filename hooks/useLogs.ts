import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { getLogs } from '@/lib/logs-repo';
import { getErrorMessage } from '@/lib/validators';
import type { CareLogWithPlant } from '@/types/log';

export function useLogs() {
  const [logs, setLogs] = useState<CareLogWithPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const nextLogs = await getLogs();
      setLogs(nextLogs);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'Не удалось загрузить журнал действий.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return {
    logs,
    loading,
    error,
    reload,
  };
}
