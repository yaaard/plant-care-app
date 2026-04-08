import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack, type Href, useRouter } from 'expo-router';

import { PlantForm } from '@/components/PlantForm';
import { createPlant } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';
import type { PlantFormValues } from '@/types/plant';

export default function AddPlantScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: PlantFormValues) => {
    setSaving(true);

    try {
      await createPlant(values);
      setErrorMessage(null);

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/plants' as Href);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось добавить растение.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Добавить растение' }} />
      <PlantForm
        errorMessage={errorMessage}
        loading={saving}
        mode="add"
        onSubmit={handleSubmit}
        submitLabel="Сохранить растение"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
});
