import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { getPendingTasks } from '@/lib/tasks-repo';
import { getErrorMessage } from '@/lib/validators';
import type { CareTaskWithPlant } from '@/types/task';

export function useTasks() {
  const [tasks, setTasks] = useState<CareTaskWithPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const nextTasks = await getPendingTasks();
      setTasks(nextTasks);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'Не удалось загрузить задачи по уходу.'));
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
    tasks,
    loading,
    error,
    reload,
  };
}
