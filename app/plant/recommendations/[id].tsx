import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { AiAnalysisCard } from '@/components/AiAnalysisCard';
import { EmptyState } from '@/components/EmptyState';
import { RecommendationCard } from '@/components/RecommendationCard';
import { RiskBadge } from '@/components/RiskBadge';
import { getLatestAiAnalysisByPlantId } from '@/lib/ai-analyses-repo';
import { findCatalogPlantForPlant } from '@/lib/plant-catalog-repo';
import { formatCareType } from '@/lib/formatters';
import { getLogsByPlantId } from '@/lib/logs-repo';
import { getPlantById } from '@/lib/plants-repo';
import { buildPlantRecommendations } from '@/lib/recommendations';
import { buildPlantRiskAssessment } from '@/lib/risk-assessment';
import { getTasksByPlantId } from '@/lib/tasks-repo';
import { getErrorMessage } from '@/lib/validators';
import type { PlantAiAnalysis } from '@/types/ai-analysis';
import type { CareLog } from '@/types/log';
import type { Plant } from '@/types/plant';
import type { PlantGuideEntry } from '@/types/recommendation';
import type { CareTask } from '@/types/task';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PlantRecommendationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [guideEntry, setGuideEntry] = useState<PlantGuideEntry | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [latestAiAnalysis, setLatestAiAnalysis] = useState<PlantAiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!plantId) {
      setErrorMessage('Не удалось определить растение.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [nextPlant, nextTasks, nextLogs, nextLatestAiAnalysis] = await Promise.all([
        getPlantById(plantId),
        getTasksByPlantId(plantId),
        getLogsByPlantId(plantId),
        getLatestAiAnalysisByPlantId(plantId),
      ]);
      const nextGuideEntry = nextPlant ? await findCatalogPlantForPlant(nextPlant) : null;

      setPlant(nextPlant);
      setGuideEntry(nextGuideEntry);
      setTasks(nextTasks);
      setLogs(nextLogs);
      setLatestAiAnalysis(nextLatestAiAnalysis);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось загрузить рекомендации.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const riskAssessment = useMemo(
    () => (plant ? buildPlantRiskAssessment(plant, tasks, logs, guideEntry) : null),
    [guideEntry, logs, plant, tasks]
  );
  const recommendation = useMemo(
    () =>
      plant && riskAssessment
        ? buildPlantRecommendations({
            plant,
            tasks,
            logs,
            guideEntry,
            riskAssessment,
            latestAiAnalysis,
          })
        : null,
    [guideEntry, latestAiAnalysis, logs, plant, riskAssessment, tasks]
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

  if (!plant || !recommendation || !riskAssessment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Рекомендации по уходу' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="Вернуться к растениям"
            description={errorMessage ?? 'Растение не найдено или уже было удалено.'}
            onActionPress={() => router.replace('/(tabs)/plants' as Href)}
            title="Рекомендации недоступны"
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
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTextBlock}>
              <Text style={styles.summaryTitle}>{plant.name}</Text>
              <Text style={styles.summarySpecies}>{plant.species}</Text>
            </View>
            <RiskBadge level={riskAssessment.riskLevel} />
          </View>

          <Text style={styles.summaryText}>{recommendation.summary}</Text>
          <Text style={styles.noteText}>
            Советы составлены на основе состояния растения, истории ухода и справочных данных.
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
        ) : null}

        <RecommendationCard content={recommendation.wateringAdvice} title="Полив" />
        <RecommendationCard content={recommendation.lightAdvice} title="Освещение" />
        <RecommendationCard content={recommendation.humidityAdvice} title="Влажность" />
        {latestAiAnalysis ? <AiAnalysisCard analysis={latestAiAnalysis} defaultExpanded /> : null}
        <RecommendationCard
          items={recommendation.riskWarnings}
          title="Возможные риски"
          tone={recommendation.riskWarnings.length > 0 ? 'warning' : 'success'}
        />
        <RecommendationCard
          items={recommendation.diagnosisHints}
          title="Возможные причины проблем"
        />
        <RecommendationCard items={recommendation.priorityChecks} title="Что проверить сейчас" />
        <RecommendationCard
          items={recommendation.personalizedTips}
          title="Персональные советы"
          tone="success"
        />
        <RecommendationCard
          items={recommendation.suggestedCareTypes.map((type) => formatCareType(type))}
          title="Подходящие действия по уходу"
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
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryTextBlock: {
    flex: 1,
    marginRight: 12,
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
