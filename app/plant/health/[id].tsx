import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { HealthTagSelector } from '@/components/HealthTagSelector';
import { RiskBadge } from '@/components/RiskBadge';
import { getPlantById, savePlantHealthState } from '@/lib/plants-repo';
import { getErrorMessage, validatePlantHealthValues } from '@/lib/validators';
import { parseConditionTags, type Plant, type PlantConditionTag } from '@/types/plant';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PlantHealthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [conditionTags, setConditionTags] = useState<PlantConditionTag[]>([]);
  const [customCareComment, setCustomCareComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const loadPlant = useCallback(async () => {
    if (!plantId) {
      setErrorMessage('Не удалось определить растение.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextPlant = await getPlantById(plantId);
      setPlant(nextPlant);
      setConditionTags(nextPlant ? parseConditionTags(nextPlant.conditionTags) : []);
      setCustomCareComment(nextPlant?.customCareComment ?? '');
      setValidationErrors([]);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось загрузить состояние растения.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void loadPlant();
    }, [loadPlant])
  );

  const handleSave = async () => {
    if (!plantId) {
      return;
    }

    const errors = validatePlantHealthValues({
      conditionTags,
      customCareComment,
    });
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setSaving(true);

    try {
      await savePlantHealthState(plantId, {
        conditionTags,
        customCareComment,
      });
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
      setErrorMessage(getErrorMessage(error, 'Не удалось сохранить состояние растения.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Загружаем состояние растения...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Состояние растения' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="К растениям"
            description={errorMessage ?? 'Растение не найдено или уже удалено.'}
            onActionPress={() => router.replace('/(tabs)/plants' as Href)}
            title="Экран недоступен"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Состояние: ${plant.name}` }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.plantName}>{plant.name}</Text>
                <Text style={styles.plantSpecies}>{plant.species}</Text>
              </View>
              <RiskBadge level={plant.riskLevel} />
            </View>

            <Text style={styles.headerText}>
              Отметьте текущие симптомы и комментарий. После сохранения приложение пересчитает
              уровень риска и обновит план ухода.
            </Text>
          </View>

          <HealthTagSelector
            helperText="Можно выбрать несколько признаков. Если растение выглядит хорошо, выберите «Выглядит здоровым»."
            label="Симптомы и состояние"
            onChange={setConditionTags}
            selectedTags={conditionTags}
          />

          <FormField
            label="Комментарий к осмотру"
            multiline
            onChangeText={setCustomCareComment}
            placeholder="Например, листья стали мягче, растение стоит ближе к окну или недавно пересох грунт."
            value={customCareComment}
          />

          {validationErrors.length > 0 ? (
            <View style={styles.errorBox}>
              {validationErrors.map((error) => (
                <Text key={error} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={saving}
            onPress={() => {
              void handleSave();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || saving) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Сохраняем...' : 'Сохранить состояние'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  headerCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  plantName: {
    color: '#163020',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  plantSpecies: {
    color: '#667085',
    fontSize: 14,
  },
  headerText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
  },
  errorBox: {
    backgroundColor: '#fff1e8',
    borderRadius: 14,
    marginBottom: 16,
    padding: 14,
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
