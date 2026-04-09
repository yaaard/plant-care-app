import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { AiActionList } from '@/components/AiActionList';
import { EmptyState } from '@/components/EmptyState';
import { QuickActionButtons } from '@/components/QuickActionButtons';
import { RiskBadge } from '@/components/RiskBadge';
import { SectionTitle } from '@/components/SectionTitle';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
import { executeAiAction } from '@/lib/ai-actions';
import { getLatestAiAnalysisByPlantId } from '@/lib/ai-analyses-repo';
import { getNextWateringDate } from '@/lib/date';
import {
  formatAiOverallCondition,
  formatAiUrgency,
  formatCareType,
  formatDateTime,
  formatDisplayDate,
  formatTaskDate,
} from '@/lib/formatters';
import { getLogsByPlantId } from '@/lib/logs-repo';
import { findCatalogPlantForPlant } from '@/lib/plant-catalog-repo';
import {
  completePlantTask,
  deletePlant,
  getPlantById,
  markPlantAsWatered,
} from '@/lib/plants-repo';
import { buildPlantRecommendations } from '@/lib/recommendations';
import { buildPlantRiskAssessment } from '@/lib/risk-assessment';
import { getTasksByPlantId } from '@/lib/tasks-repo';
import { getErrorMessage } from '@/lib/validators';
import type { PlantAiAnalysis } from '@/types/ai-analysis';
import type { AiAction } from '@/types/ai-action';
import type { CareLog } from '@/types/log';
import type { Plant } from '@/types/plant';
import type { PlantGuideEntry } from '@/types/recommendation';
import type { CareTask } from '@/types/task';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <Text style={styles.bodyText}>Пока без дополнительных пунктов.</Text>;
  }

  return items.map((item) => (
    <Text key={item} style={styles.bodyText}>
      • {item}
    </Text>
  ));
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function PlantDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [guideEntry, setGuideEntry] = useState<PlantGuideEntry | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [latestAiAnalysis, setLatestAiAnalysis] = useState<PlantAiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null);
  const [appliedActionIds, setAppliedActionIds] = useState<string[]>([]);
  const [hiddenActionIds, setHiddenActionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
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
      setErrorMessage(getErrorMessage(error, 'Не удалось загрузить карточку растения.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetails();
    }, [loadDetails])
  );

  const handleMarkWatered = async () => {
    if (!plantId) {
      return;
    }

    setBusy(true);

    try {
      await markPlantAsWatered(plantId);
      await loadDetails();
      setFeedback('Полив отмечен, график ухода обновлён.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось отметить полив.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteTask = async (task: CareTask) => {
    setBusyTaskId(task.id);

    try {
      await completePlantTask(task.id);
      await loadDetails();
      setFeedback(`Задача "${formatCareType(task.type)}" отмечена выполненной.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось отметить задачу выполненной.'));
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleApplyAiAction = async (action: AiAction) => {
    if (!latestAiAnalysis) {
      return;
    }

    setApplyingActionId(action.id);

    try {
      const result = await executeAiAction(action, {
        source: { plantId: plant?.id ?? plantId ?? null, analysisId: latestAiAnalysis.id },
      });

      if (result.status === 'dismissed') {
        setHiddenActionIds((current) =>
          current.includes(action.id) ? current : [...current, action.id]
        );
      } else {
        setAppliedActionIds((current) =>
          current.includes(action.id) ? current : [...current, action.id]
        );
      }

      if (result.status === 'navigated' && result.navigationTarget) {
        router.push(result.navigationTarget as Href);
        return;
      }

      await loadDetails();
      setFeedback(result.message);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось применить действие.'));
    } finally {
      setApplyingActionId(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Удалить растение?',
      'Карточка растения, задачи по уходу и журнал действий будут удалены с этого устройства.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            if (!plantId) {
              return;
            }

            setBusy(true);

            void (async () => {
              try {
                await deletePlant(plantId);
                router.replace('/(tabs)/plants' as Href);
              } catch (error) {
                setErrorMessage(getErrorMessage(error, 'Не удалось удалить растение.'));
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

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
  const activeTasks = useMemo(() => tasks.filter((task) => task.isCompleted === 0), [tasks]);
  const nextWateringDate =
    activeTasks.find((task) => task.type === 'watering')?.scheduledDate ??
    (plant ? getNextWateringDate(plant.lastWateringDate, plant.wateringIntervalDays) : null);

  const highlights = recommendation?.highlights.slice(0, 2) ?? [];
  const priorityChecks = recommendation?.priorityChecks.slice(0, 3) ?? [];
  const latestAiActions = latestAiAnalysis?.recommendedActions.slice(0, 2) ?? [];

  if (loading && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          <Text style={styles.centeredText}>Загружаем карточку растения...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant || !riskAssessment || !recommendation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Карточка растения' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="Вернуться к списку"
            description={errorMessage ?? 'Растение не найдено или уже было удалено.'}
            onActionPress={() => router.replace('/(tabs)/plants' as Href)}
            title="Карточка недоступна"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: plant.name,
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/plant/edit/[id]',
                  params: { id: plant.id },
                } as unknown as Href)
              }
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              <Text style={styles.headerButtonText}>Изм.</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <View style={styles.mediaCard}>
            {plant.photoUri ? (
              <Image source={{ uri: plant.photoUri }} style={styles.heroImage} />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons color={AppTheme.colors.primaryStrong} name="leaf-outline" size={34} />
                <Text style={styles.heroPlaceholderTitle}>Фото пока не добавлено</Text>
                <Text style={styles.heroPlaceholderText}>
                  Добавьте снимок, чтобы карточка выглядела нагляднее.
                </Text>
              </View>
            )}

            <View style={styles.imageShade} />

            <View style={styles.mediaTopRow}>
              <RiskBadge level={riskAssessment.riskLevel} />
              {guideEntry ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/catalog/[id]',
                      params: { id: guideEntry.id },
                    } as unknown as Href)
                  }
                  style={({ pressed }) => [styles.mediaChip, pressed && styles.pressed]}
                >
                  <Text style={styles.mediaChipText}>Справочник</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.mediaBottomRow}>
              <StatPill label="Следующий полив" value={formatTaskDate(nextWateringDate)} />
              <StatPill label="Активных задач" value={String(activeTasks.length)} />
            </View>
          </View>

          <SurfaceCard style={styles.summaryCard}>
            <Text style={styles.kicker}>
              {guideEntry ? guideEntry.category : 'Персональная карточка'}
            </Text>
            <Text style={styles.title}>{plant.name}</Text>
            <Text style={styles.subtitle}>{plant.species}</Text>
            <Text style={styles.summaryText}>{riskAssessment.summary}</Text>

            <View style={styles.metricRow}>
              <StatPill
                label="Фото"
                value={latestAiAnalysis ? formatAiUrgency(latestAiAnalysis.urgency) : 'нет'}
              />
              <StatPill label="Полив" value={formatDisplayDate(plant.lastWateringDate)} />
              <StatPill label="Риск" value={`${riskAssessment.score}/100`} />
            </View>

            <View style={styles.actionRow}>
              <Button
                compact
                label={busy ? 'Сохраняем...' : 'Отметить полив'}
                onPress={() => {
                  void handleMarkWatered();
                }}
              />
              <Button
                compact
                label="Открыть чат"
                onPress={() =>
                  router.push({
                    pathname: '/plant/chat/[id]',
                    params: { id: plant.id },
                  } as unknown as Href)
                }
                tone="secondary"
              />
            </View>
          </SurfaceCard>
        </View>

        {feedback ? <InlineBanner text={feedback} tone="success" /> : null}
        {errorMessage ? <InlineBanner text={errorMessage} tone="error" /> : null}

        <SurfaceCard style={styles.sectionCard}>
          <SectionTitle title="Что делать сейчас" />

          <View style={styles.innerBlock}>
            <Text style={styles.blockLabel}>Главный фокус</Text>
            <BulletList items={highlights} />
          </View>

          <View style={styles.innerBlock}>
            <Text style={styles.blockLabel}>Ближайшие проверки</Text>
            <BulletList items={priorityChecks} />
          </View>

          <View style={styles.innerBlock}>
            <Text style={styles.blockLabel}>Быстрое закрытие задач</Text>
            {activeTasks.length > 0 ? (
              <>
                <QuickActionButtons
                  busyTaskId={busyTaskId}
                  onComplete={(task) => {
                    void handleCompleteTask(task);
                  }}
                  tasks={activeTasks.slice(0, 2)}
                />

                <View style={styles.quickList}>
                  {activeTasks.slice(0, 2).map((task) => (
                    <View key={task.id} style={styles.quickRow}>
                      <Text style={styles.quickTitle}>{formatCareType(task.type)}</Text>
                      <Text style={styles.quickDate}>{formatTaskDate(task.scheduledDate)}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.bodyText}>Активных задач сейчас нет.</Text>
            )}
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.sectionCard}>
          <SectionTitle
            actionLabel="Открыть разбор"
            onActionPress={() =>
              router.push({
                pathname: '/plant/analysis/[id]',
                params: { id: plant.id },
              } as unknown as Href)
            }
            title="Последняя проверка по фото"
          />

          {latestAiAnalysis ? (
            <>
              <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <Text style={styles.aiStatus}>
                    {formatAiOverallCondition(latestAiAnalysis.overallCondition)}
                  </Text>
                  <Text style={styles.aiMeta}>{formatAiUrgency(latestAiAnalysis.urgency)}</Text>
                </View>
                <Text style={styles.aiSummary}>{latestAiAnalysis.summary}</Text>
                <Text style={styles.aiDate}>
                  Обновлено {formatDateTime(latestAiAnalysis.createdAt)}
                </Text>
                {latestAiActions.length > 0 ? <BulletList items={latestAiActions} /> : null}
              </View>

              <AiActionList
                actions={latestAiAnalysis.actions.slice(0, 3)}
                appliedActionIds={appliedActionIds}
                applyingActionId={applyingActionId}
                emptyText="Быстрых действий по последнему анализу пока нет."
                hiddenActionIds={hiddenActionIds}
                onApply={(action) => {
                  void handleApplyAiAction(action);
                }}
                title="Рекомендуемые действия"
              />
            </>
          ) : (
            <EmptyState
              description="После первой проверки здесь появятся вывод и полезные действия."
              title="Проверка фото ещё не запускалась"
            />
          )}
        </SurfaceCard>

        <SurfaceCard style={styles.sectionCard}>
          <SectionTitle title="Полезные разделы" />

          <View style={styles.moreActions}>
            <Button
              compact
              label="Анализ фото"
              onPress={() =>
                router.push({
                  pathname: '/plant/analysis/[id]',
                  params: { id: plant.id },
                } as unknown as Href)
              }
              tone="secondary"
            />
            <Button
              compact
              label="Состояние растения"
              onPress={() =>
                router.push({
                  pathname: '/plant/health/[id]',
                  params: { id: plant.id },
                } as unknown as Href)
              }
              tone="ghost"
            />
            <Button
              compact
              label="Рекомендации"
              onPress={() =>
                router.push({
                  pathname: '/plant/recommendations/[id]',
                  params: { id: plant.id },
                } as unknown as Href)
              }
              tone="ghost"
            />
            <Button
              compact
              label="План ухода"
              onPress={() => router.push('/(tabs)/schedule' as Href)}
              tone="ghost"
            />
            <Button
              compact
              label="Журнал ухода"
              onPress={() => router.push('/(tabs)/history' as Href)}
              tone="ghost"
            />
          </View>
        </SurfaceCard>

        <Button
          compact
          label={busy ? 'Удаляем...' : 'Удалить растение'}
          onPress={confirmDelete}
          tone="danger"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  content: {
    padding: AppTheme.spacing.page,
    paddingBottom: AppTheme.spacing.xxxl,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centeredText: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.pill,
    justifyContent: 'center',
    minWidth: 54,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  heroWrap: {
    marginBottom: AppTheme.spacing.section,
  },
  mediaCard: {
    borderRadius: AppTheme.radius.xxl,
    minHeight: 320,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    height: 330,
    width: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    height: 330,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  heroPlaceholderTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  heroPlaceholderText: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 35, 27, 0.24)',
  },
  mediaTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  mediaChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediaChipText: {
    color: AppTheme.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  mediaBottomRow: {
    bottom: 16,
    flexDirection: 'row',
    gap: 10,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  summaryCard: {
    marginHorizontal: 12,
    marginTop: -44,
  },
  kicker: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 35,
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    marginTop: 6,
  },
  summaryText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  statPill: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: 18,
    flex: 1,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  statLabel: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  sectionCard: {
    marginBottom: AppTheme.spacing.section,
  },
  innerBlock: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.lg,
    marginTop: 12,
    padding: 14,
  },
  blockLabel: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bodyText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  quickList: {
    marginTop: 12,
  },
  quickRow: {
    alignItems: 'center',
    borderTopColor: AppTheme.colors.stroke,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  quickTitle: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  quickDate: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
  },
  aiCard: {
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.xl,
    marginBottom: 14,
    padding: 16,
  },
  aiHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiStatus: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 15,
    fontWeight: '800',
  },
  aiMeta: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  aiSummary: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  aiDate: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 10,
    marginTop: 8,
  },
  moreActions: {
    gap: 10,
    marginTop: 14,
  },
  pressed: {
    opacity: 0.92,
  },
});
