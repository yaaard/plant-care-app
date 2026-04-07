import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { PlantForm } from '@/components/PlantForm';
import { getPlantById, updatePlant } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';
import { parseConditionTags, type PlantFormValues } from '@/types/plant';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function EditPlantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);

  const [initialValues, setInitialValues] = useState<PlantFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPlant = useCallback(async () => {
    if (!plantId) {
      setErrorMessage('Не удалось определить растение для редактирования.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const plant = await getPlantById(plantId);

      if (!plant) {
        setInitialValues(null);
        setErrorMessage('Растение не найдено.');
      } else {
        setInitialValues({
          name: plant.name,
          species: plant.species,
          photoUri: plant.photoUri,
          lastWateringDate: plant.lastWateringDate,
          wateringIntervalDays: plant.wateringIntervalDays,
          notes: plant.notes,
          lightCondition: plant.lightCondition,
          humidityCondition: plant.humidityCondition,
          roomTemperature: plant.roomTemperature,
          conditionTags: parseConditionTags(plant.conditionTags),
          customCareComment: plant.customCareComment,
        });
        setErrorMessage(null);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось загрузить данные растения.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void loadPlant();
    }, [loadPlant])
  );

  const handleSubmit = async (values: PlantFormValues) => {
    if (!plantId) {
      return;
    }

    setSaving(true);

    try {
      const updatedPlant = await updatePlant(plantId, values);

      if (!updatedPlant) {
        setErrorMessage('Растение не найдено.');
        return;
      }

      setErrorMessage(null);

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({
          pathname: '/plant/[id]',
          params: { id: plantId },
        } as unknown as Href);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось сохранить изменения.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Загружаем форму редактирования...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!initialValues) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Редактировать растение' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="К списку растений"
            description={errorMessage ?? 'Карточка для редактирования недоступна.'}
            onActionPress={() => router.replace('/(tabs)/plants' as Href)}
            title="Не удалось открыть форму"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Редактировать растение' }} />
      <PlantForm
        errorMessage={errorMessage}
        initialValues={initialValues}
        loading={saving}
        onSubmit={handleSubmit}
        submitLabel="Сохранить изменения"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centeredText: {
    color: '#163020',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
});
