import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import { subscribeToLocalDataChanges } from '@/lib/local-events';
import { getPlantListItems } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';
import type { PlantListItem } from '@/types/plant';

export function usePlants() {
  const [plants, setPlants] = useState<PlantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const nextPlants = await getPlantListItems();
      setPlants(nextPlants);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'Не удалось загрузить список растений.'));
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
    plants,
    loading,
    error,
    reload,
  };
}
