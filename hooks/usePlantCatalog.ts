import { useCallback, useEffect, useState } from 'react';

import {
  getAllCatalogPlants,
  searchCatalogPlants,
} from '@/lib/plant-catalog-repo';
import { subscribeToLocalDataChanges } from '@/lib/local-events';
import { getErrorMessage } from '@/lib/validators';
import type { PlantCatalogPlant } from '@/types/plant-catalog';

export function usePlantCatalog(query = '') {
  const [plants, setPlants] = useState<PlantCatalogPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);

    try {
      const nextPlants = query.trim()
        ? await searchCatalogPlants(query)
        : await getAllCatalogPlants();

      setPlants(nextPlants);
      setError(null);
    } catch (nextError) {
      setError(
        getErrorMessage(nextError, 'Не удалось загрузить локальный справочник растений.')
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => subscribeToLocalDataChanges(() => void loadCatalog()), [loadCatalog]);

  return {
    plants,
    loading,
    error,
    reload: loadCatalog,
  };
}
