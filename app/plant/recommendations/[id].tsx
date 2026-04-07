import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { RecommendationCard } from '@/components/RecommendationCard';
import { getPlantGuideEntryByName } from '@/constants/plantGuide';
import { getPlantById } from '@/lib/plants-repo';
import { buildPlantRecommendations } from '@/lib/recommendations';
import { getErrorMessage } from '@/lib/validators';
import type { Plant } from '@/types/plant';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function PlantRecommendationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось загрузить рекомендации.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void loadPlant();
    }, [loadPlant])
  );

  const guideEntry = useMemo(
    () => (plant ? getPlantGuideEntryByName(plant.species) : null),
    [plant]
  );
  const recommendation = useMemo(
    () => (plant ? buildPlantRecommendations(plant, guideEntry) : null),
    [guideEntry, plant]
  );

  if (loading && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Анализируем данные растения...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant || !recommendation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Рекомендации по уходу' }} />
        <View style={styles.content}>
          <EmptyState
            title="Рекомендации недоступны"
            description={errorMessage ?? 'Растение не найдено или уже было удалено.'}
            actionLabel="Вернуться к растениям"
            onActionPress={() => router.replace('/(tabs)/plants' as Href)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Рекомендации: ${plant.name}` }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{plant.name}</Text>
          <Text style={styles.summarySpecies}>{plant.species}</Text>
          <Text style={styles.summaryText}>{recommendation.summary}</Text>
          <Text style={styles.noteText}>
            Советы носят ориентировочный характер и основаны на локальных правилах, а не на
            профессиональной диагностике.
          </Text>
        </View>

        {guideEntry ? (
          <View style={styles.referenceCard}>
            <Text style={styles.referenceTitle}>Ориентиры из справочника</Text>
            <Text style={styles.referenceText}>
              Полив: примерно раз в {guideEntry.recommendedWateringIntervalDays} дн.
            </Text>
            <Text style={styles.referenceText}>Свет: {guideEntry.lightLevel}</Text>
            <Text style={styles.referenceText}>Влажность: {guideEntry.humidityLevel}</Text>
            <Text style={styles.referenceText}>Температура: {guideEntry.temperatureRange}</Text>
          </View>
        ) : (
          <View style={styles.referenceCard}>
            <Text style={styles.referenceTitle}>Справка по виду</Text>
            <Text style={styles.referenceText}>
              Для этого вида не найдено точного совпадения в локальном справочнике, поэтому советы
              остаются более общими.
            </Text>
          </View>
        )}

        <RecommendationCard title="Полив" content={recommendation.wateringAdvice} />
        <RecommendationCard title="Освещение" content={recommendation.lightAdvice} />
        <RecommendationCard title="Влажность" content={recommendation.humidityAdvice} />
        <RecommendationCard
          title="Возможные риски"
          content={
            recommendation.riskWarnings.length === 0
              ? 'Явных рисков по текущим данным не выявлено, но режим ухода всё равно стоит периодически пересматривать.'
              : undefined
          }
          items={recommendation.riskWarnings}
          tone={recommendation.riskWarnings.length > 0 ? 'warning' : 'success'}
        />
        <RecommendationCard
          title="Возможные причины проблем"
          content={
            recommendation.diagnosisHints.length === 0
              ? 'Явных симптомов сейчас не отмечено. Сохраняйте стабильный режим и наблюдайте за изменениями.'
              : undefined
          }
          items={recommendation.diagnosisHints}
        />
        <RecommendationCard
          title="Персональные советы"
          items={recommendation.personalizedTips}
          tone="success"
        />
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
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  summaryTitle: {
    color: '#163020',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  summarySpecies: {
    color: '#667085',
    fontSize: 15,
    marginBottom: 12,
  },
  summaryText: {
    color: '#163020',
    fontSize: 15,
    lineHeight: 22,
  },
  noteText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  referenceCard: {
    backgroundColor: '#edf7ef',
    borderRadius: 18,
    marginBottom: 12,
    padding: 16,
  },
  referenceTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  referenceText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
});
