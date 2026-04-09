import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { AiActionList } from '@/components/AiActionList';
import { AiAnalysisCard } from '@/components/AiAnalysisCard';
import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
import { useAiAnalyses } from '@/hooks/useAiAnalyses';
import { useSync } from '@/hooks/useSync';
import { executeAiAction } from '@/lib/ai-actions';
import { formatAiUrgency, formatDateTime } from '@/lib/formatters';
import { requestPlantAiAnalysis } from '@/lib/gemini-client';
import { getPlantById } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';
import type { AiAction } from '@/types/ai-action';
import type { Plant } from '@/types/plant';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  text: string;
} | null;

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function PlantPhotoAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const { syncNow, isSyncing } = useSync();
  const { analyses, latestAnalysis, loading: analysesLoading, reload: reloadAnalyses } =
    useAiAnalyses(plantId);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loadingPlant, setLoadingPlant] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null);
  const [appliedActionIds, setAppliedActionIds] = useState<string[]>([]);
  const [hiddenActionIds, setHiddenActionIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadPlant = useCallback(async () => {
    if (!plantId) {
      setPlant(null);
      setFeedback({ type: 'error', text: 'Не удалось определить растение для проверки фото.' });
      setLoadingPlant(false);
      return;
    }

    setLoadingPlant(true);
    try {
      const nextPlant = await getPlantById(plantId);
      setPlant(nextPlant);
      if (!nextPlant) {
        setFeedback({ type: 'error', text: 'Растение не найдено или уже было удалено.' });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось загрузить растение для проверки фото.'),
      });
    } finally {
      setLoadingPlant(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void loadPlant();
    }, [loadPlant])
  );

  const openEditPhoto = () => {
    if (!plantId) {
      return;
    }
    router.push({ pathname: '/plant/edit/[id]', params: { id: plantId } } as unknown as Href);
  };

  const confirmPhotoRequirement = () => {
    Alert.alert(
      'Сначала добавьте фото растения',
      'Без фотографии не получится оценить состояние растения. Добавьте снимок из галереи.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Открыть редактирование', onPress: openEditPhoto },
      ]
    );
  };

  const handleRunAnalysis = async () => {
    if (!plantId || !plant) {
      return;
    }
    if (!plant.photoUri && !plant.photoPath) {
      confirmPhotoRequirement();
      return;
    }
    if (isSyncing) {
      setFeedback({
        type: 'info',
        text: 'Сначала дождитесь завершения обновления данных, затем попробуйте ещё раз.',
      });
      return;
    }

    setRunningAnalysis(true);
    setFeedback({ type: 'info', text: 'Подготавливаем фото к проверке...' });
    try {
      if (plant.photoUri?.startsWith('file') || plant.syncStatus !== 'synced' || !plant.photoPath) {
        const syncCompleted = await syncNow();
        if (!syncCompleted) {
          throw new Error('Не удалось подготовить фото для анализа. Проверьте интернет и повторите попытку.');
        }
        await loadPlant();
      }

      const refreshedPlant = await getPlantById(plantId);
      if (!refreshedPlant?.photoPath) {
        throw new Error('Фото растения ещё не готово. Дождитесь обновления снимка и попробуйте снова.');
      }

      setFeedback({ type: 'info', text: 'Идёт анализ фото. Это может занять до минуты.' });
      await requestPlantAiAnalysis(plantId);
      await reloadAnalyses();
      await loadPlant();
      setFeedback({ type: 'success', text: 'Проверка фото завершена. Результат сохранён в истории растения.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось выполнить проверку фото растения.'),
      });
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleApplyAction = async (action: AiAction) => {
    if (!latestAnalysis || applyingActionId) {
      return;
    }
    setApplyingActionId(action.id);
    try {
      const result = await executeAiAction(action, { source: { plantId, analysisId: latestAnalysis.id } });
      if (result.status === 'dismissed') {
        setHiddenActionIds((current) => (current.includes(action.id) ? current : [...current, action.id]));
      } else {
        setAppliedActionIds((current) => (current.includes(action.id) ? current : [...current, action.id]));
      }
      if (result.status === 'navigated') {
        router.push(result.navigationTarget as Href);
      }
      await Promise.all([reloadAnalyses(), loadPlant()]);
      setFeedback({ type: 'success', text: result.message });
    } catch (error) {
      setFeedback({ type: 'error', text: getErrorMessage(error, 'Не удалось применить действие.') });
    } finally {
      setApplyingActionId(null);
    }
  };

  const photoReady = Boolean(plant?.photoPath);
  const latestSummaryPoints = useMemo(
    () => latestAnalysis?.recommendedActions.slice(0, 3) ?? [],
    [latestAnalysis]
  );

  if (loadingPlant && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          <Text style={styles.centeredText}>Готовим результаты проверки...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Анализ фото' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="Вернуться к растениям"
            description={feedback?.text ?? 'Растение не найдено или уже было удалено.'}
            onActionPress={() => router.replace('/(tabs)/plants' as Href)}
            title="Проверка фото недоступна"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Анализ фото: ${plant.name}` }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <View style={styles.heroMedia}>
            {plant.photoUri ? (
              <Image source={{ uri: plant.photoUri }} style={styles.heroImage} />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons color={AppTheme.colors.primaryStrong} name="image-outline" size={32} />
                <Text style={styles.heroPlaceholderTitle}>Фото пока не добавлено</Text>
                <Text style={styles.heroPlaceholderText}>
                  Для проверки нужен снимок растения. Его можно добавить в карточке редактирования.
                </Text>
              </View>
            )}
            <View style={styles.heroShade} />
            <View style={styles.heroScanBadge}>
              <Ionicons color={AppTheme.colors.white} name="scan-outline" size={16} />
              <Text style={styles.heroScanText}>Фото</Text>
            </View>
          </View>

          <SurfaceCard style={styles.heroCard}>
            <Text style={styles.kicker}>{plant.species}</Text>
            <Text style={styles.title}>Проверка фото {plant.name}</Text>
            <Text style={styles.bodyText}>
              Здесь хранится история фотоанализов, статус текущего снимка и готовые действия, которые можно применить сразу.
            </Text>

            <View style={styles.metricRow}>
              <StatPill label="Снимок" value={photoReady ? 'Готово' : 'Нужно фото'} />
              <StatPill label="Статус" value={latestAnalysis ? formatAiUrgency(latestAnalysis.urgency) : 'нет'} />
              <StatPill label="Анализов" value={String(analyses.length)} />
            </View>

            <View style={styles.buttonRow}>
              <Button
                label={
                  runningAnalysis
                    ? 'Идёт анализ...'
                    : isSyncing
                      ? 'Синхронизируем фото...'
                      : 'Проанализировать растение'
                }
                onPress={() => {
                  void handleRunAnalysis();
                }}
              />
              <Button compact label="Обновить фото" onPress={openEditPhoto} tone="secondary" />
            </View>
          </SurfaceCard>
        </View>

        {feedback ? <InlineBanner text={feedback.text} tone={feedback.type} /> : null}

        <View style={[styles.twoCol, !isWide && styles.twoColStack]}>
          <SurfaceCard style={styles.mainCol}>
            <SectionTitle title="Последний анализ" />
            {latestAnalysis ? (
              <>
                <AiAnalysisCard analysis={latestAnalysis} defaultExpanded />
                <AiActionList
                  actions={latestAnalysis.actions}
                  appliedActionIds={appliedActionIds}
                  applyingActionId={applyingActionId}
                  emptyText="Для этого анализа пока нет действий, которые можно применить одной кнопкой."
                  hiddenActionIds={hiddenActionIds}
                  onApply={(action) => {
                    void handleApplyAction(action);
                  }}
                  title="Рекомендуемые действия"
                />
              </>
            ) : analysesLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={AppTheme.colors.primary} />
                <Text style={styles.loadingText}>Загружаем историю анализов...</Text>
              </View>
            ) : (
              <EmptyState
                description="После первой проверки здесь появится последний результат с рекомендациями."
                title="Анализов пока нет"
              />
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.sideCol} tone="soft">
            <SectionTitle title="Что сделать сейчас" />
            {latestSummaryPoints.length > 0 ? (
              latestSummaryPoints.map((item) => (
                <Text key={item} style={styles.bodyText}>
                  • {item}
                </Text>
              ))
            ) : (
              <Text style={styles.bodyText}>После первого анализа здесь появятся главные шаги.</Text>
            )}
            <View style={styles.sideMetaCard}>
              <Text style={styles.sideMetaLabel}>Последнее обновление</Text>
              <Text style={styles.sideMetaValue}>
                {latestAnalysis ? formatDateTime(latestAnalysis.createdAt) : '—'}
              </Text>
            </View>
          </SurfaceCard>
        </View>

        <SurfaceCard>
          <SectionTitle title="История анализов" />
          {analyses.length > 1 ? (
            analyses.slice(1).map((analysis) => <AiAnalysisCard key={analysis.id} analysis={analysis} />)
          ) : (
            <EmptyState
              description="Когда вы запустите проверку повторно, предыдущие результаты останутся здесь."
              title="История пока пустая"
            />
          )}
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: AppTheme.colors.page, flex: 1 },
  content: { padding: AppTheme.spacing.page, paddingBottom: AppTheme.spacing.xxxl },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  centeredText: { color: AppTheme.colors.text, fontSize: 15, marginTop: 12, textAlign: 'center' },
  heroWrap: { marginBottom: AppTheme.spacing.section },
  heroMedia: { borderRadius: AppTheme.radius.xxl, overflow: 'hidden', position: 'relative' },
  heroImage: { height: 320, width: '100%' },
  heroPlaceholder: { alignItems: 'center', backgroundColor: AppTheme.colors.surfaceSoft, height: 320, justifyContent: 'center', paddingHorizontal: 28 },
  heroPlaceholderTitle: { color: AppTheme.colors.text, fontSize: 19, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  heroPlaceholderText: { color: AppTheme.colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23, 32, 25, 0.24)' },
  heroScanBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.24)', borderRadius: AppTheme.radius.pill, borderWidth: 1, flexDirection: 'row', gap: 6, left: 16, paddingHorizontal: 12, paddingVertical: 8, position: 'absolute', top: 16 },
  heroScanText: { color: AppTheme.colors.white, fontSize: 12, fontWeight: '700' },
  heroCard: { marginHorizontal: 12, marginTop: -44 },
  kicker: { color: AppTheme.colors.primaryStrong, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  title: { color: AppTheme.colors.text, fontSize: 31, fontWeight: '800', letterSpacing: -1, lineHeight: 35 },
  bodyText: { color: AppTheme.colors.text, fontSize: 14, lineHeight: 21, marginTop: 8 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  statPill: { backgroundColor: AppTheme.colors.surfaceMuted, borderRadius: 18, flex: 1, minWidth: 92, paddingHorizontal: 12, paddingVertical: 11 },
  statLabel: { color: AppTheme.colors.textSoft, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { color: AppTheme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  buttonRow: { gap: 10, marginTop: 16 },
  twoCol: { flexDirection: 'row', gap: AppTheme.spacing.section, marginBottom: AppTheme.spacing.section },
  twoColStack: { flexDirection: 'column' },
  mainCol: { flex: 1.1 },
  sideCol: { flex: 0.9 },
  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  loadingText: { color: AppTheme.colors.text, fontSize: 14 },
  sideMetaCard: { backgroundColor: AppTheme.colors.surface, borderColor: AppTheme.colors.stroke, borderRadius: AppTheme.radius.lg, borderWidth: 1, marginTop: 16, padding: 14 },
  sideMetaLabel: { color: AppTheme.colors.textSoft, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  sideMetaValue: { color: AppTheme.colors.text, fontSize: 14, fontWeight: '700', marginTop: 6 },
});
