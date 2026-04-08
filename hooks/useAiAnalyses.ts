import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { subscribeToLocalDataChanges } from '@/lib/local-events';
import { getAiAnalysesByPlantId } from '@/lib/ai-analyses-repo';
import { getErrorMessage } from '@/lib/validators';
import type { PlantAiAnalysis } from '@/types/ai-analysis';

export function useAiAnalyses(plantId: string | null | undefined) {
  const [analyses, setAnalyses] = useState<PlantAiAnalysis[]>([]);
  const [loading, setLoading] = useState(Boolean(plantId));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!plantId) {
      setAnalyses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    try {
      const nextAnalyses = await getAiAnalysesByPlantId(plantId);
      setAnalyses(nextAnalyses);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'Не удалось загрузить историю AI-анализа.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  useEffect(() => {
    return subscribeToLocalDataChanges(() => {
      void reload();
    });
  }, [reload]);

  const latestAnalysis = useMemo(() => analyses[0] ?? null, [analyses]);

  return {
    analyses,
    latestAnalysis,
    loading,
    error,
    reload,
  };
}
