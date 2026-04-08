import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import {
  getCatalogPlantById,
  getCatalogSymptomsByPlantId,
} from '@/lib/plant-catalog-repo';
import { getErrorMessage } from '@/lib/validators';
import {
  formatCatalogTemperatureRange,
  formatCatalogWateringRange,
  type PlantCatalogPlant,
  type PlantCatalogSymptom,
} from '@/types/plant-catalog';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatBooleanLabel(value: boolean, positiveLabel: string, negativeLabel: string) {
  return value ? positiveLabel : negativeLabel;
}

export default function CatalogPlantDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const catalogPlantId = normalizeParam(params.id);

  const [plant, setPlant] = useState<PlantCatalogPlant | null>(null);
  const [symptoms, setSymptoms] = useState<PlantCatalogSymptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCatalogEntry = useCallback(async () => {
    if (!catalogPlantId) {
      setErrorMessage('Не удалось определить запись справочника.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [nextPlant, nextSymptoms] = await Promise.all([
        getCatalogPlantById(catalogPlantId),
        getCatalogSymptomsByPlantId(catalogPlantId),
      ]);

      setPlant(nextPlant);
      setSymptoms(nextSymptoms);
      setErrorMessage(nextPlant ? null : 'Запись справочника не найдена.');
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Не удалось загрузить карточку растения из справочника.')
      );
    } finally {
      setLoading(false);
    }
  }, [catalogPlantId]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalogEntry();
    }, [loadCatalogEntry])
  );

  if (loading && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Загружаем карточку из справочника...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Справочник' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="Назад к справочнику"
            description={errorMessage ?? 'Запись справочника недоступна.'}
            onActionPress={() => router.replace('/(tabs)/guide' as Href)}
            title="Запись не найдена"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: plant.nameRu }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{plant.nameRu}</Text>
          <Text style={styles.latinTitle}>{plant.nameLatin}</Text>
          <Text style={styles.description}>{plant.description}</Text>

          <View style={styles.metaWrap}>
            <Text style={styles.metaChip}>{plant.category}</Text>
            <Text style={styles.metaChip}>{plant.difficultyLevel}</Text>
            <Text style={styles.metaChip}>
              {formatBooleanLabel(plant.petSafe, 'безопасно для животных', 'может быть опасно для животных')}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <SectionTitle title="Базовые параметры ухода" />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Полив</Text>
            <Text style={styles.infoValue}>{formatCatalogWateringRange(plant)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Освещение</Text>
            <Text style={styles.infoValue}>{plant.lightLevel}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Влажность</Text>
            <Text style={styles.infoValue}>{plant.humidityLevel}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Температура</Text>
            <Text style={styles.infoValue}>{formatCatalogTemperatureRange(plant)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Грунт</Text>
            <Text style={styles.infoValue}>{plant.soilType || 'Нет данных'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Подкормка</Text>
            <Text style={styles.infoValue}>{plant.fertilizingInfo || 'Нет данных'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Опрыскивание</Text>
            <Text style={styles.infoValue}>
              {formatBooleanLabel(
                plant.sprayingNeeded,
                plant.sprayingIntervalDays
                  ? `нужно, примерно раз в ${plant.sprayingIntervalDays} дн.`
                  : 'обычно полезно',
                'обычно не требуется'
              )}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <SectionTitle title="Советы по уходу" />
          <Text style={styles.bodyText}>{plant.careTips || 'Пока нет дополнительных советов.'}</Text>

          <Text style={styles.sectionLabel}>Типичные ошибки и риски</Text>
          <Text style={styles.bodyText}>{plant.riskNotes || 'Пока нет дополнительных заметок о рисках.'}</Text>
        </View>

        <View style={styles.card}>
          <SectionTitle title="Типовые симптомы и действия" />
          {symptoms.length === 0 ? (
            <Text style={styles.bodyText}>
              Для этой записи пока не добавлены типовые симптомы.
            </Text>
          ) : (
            symptoms.map((symptom) => (
              <View key={symptom.id} style={styles.symptomCard}>
                <Text style={styles.symptomTitle}>{symptom.symptomNameRu}</Text>
                <Text style={styles.symptomLabel}>Возможная причина</Text>
                <Text style={styles.bodyText}>{symptom.possibleCause}</Text>
                <Text style={styles.symptomLabel}>Рекомендуемое действие</Text>
                <Text style={styles.bodyText}>{symptom.recommendedAction}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  title: {
    color: '#163020',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  latinTitle: {
    color: '#667085',
    fontSize: 14,
    marginBottom: 12,
  },
  description: {
    color: '#163020',
    fontSize: 15,
    lineHeight: 22,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metaChip: {
    backgroundColor: '#edf7ef',
    borderRadius: 999,
    color: '#2f6f3e',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  infoItem: {
    backgroundColor: '#f7faf7',
    borderRadius: 14,
    marginTop: 10,
    padding: 12,
  },
  infoLabel: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#163020',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14,
  },
  bodyText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
  },
  symptomCard: {
    backgroundColor: '#f7faf7',
    borderRadius: 16,
    marginTop: 12,
    padding: 14,
  },
  symptomTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  symptomLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});
