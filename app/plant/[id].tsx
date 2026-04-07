import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  type TextStyle,
  View,
} from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { CareTaskCard } from '@/components/CareTaskCard';
import { EmptyState } from '@/components/EmptyState';
import { QuickActionButtons } from '@/components/QuickActionButtons';
import { RiskBadge } from '@/components/RiskBadge';
import { SectionTitle } from '@/components/SectionTitle';
import { getHealthTagLabel } from '@/constants/healthTags';
import { getPlantGuideEntryByName } from '@/constants/plantGuide';
import { formatCareType, formatDateTime, formatDisplayDate, formatTaskDate } from '@/lib/formatters';
import { getNextWateringDate } from '@/lib/date';
import { getLogsByPlantId } from '@/lib/logs-repo';
import { completePlantTask, deletePlant, getPlantById, markPlantAsWatered } from '@/lib/plants-repo';
import { buildPlantRecommendations } from '@/lib/recommendations';
import { buildPlantRiskAssessment } from '@/lib/risk-assessment';
import { getTasksByPlantId } from '@/lib/tasks-repo';
import { getErrorMessage } from '@/lib/validators';
import type { CareLog } from '@/types/log';
import { parseConditionTags, type Plant } from '@/types/plant';
import type { CareTask } from '@/types/task';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function renderPlainList(items: string[], textStyle: StyleProp<TextStyle>) {
  return items.map((item) => (
    <Text key={item} style={textStyle}>
      - {item}
    </Text>
  ));
}

export default function PlantDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!plantId) {
      setErrorMessage('Не удалось определить растение.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [nextPlant, nextTasks, nextLogs] = await Promise.all([
        getPlantById(plantId),
        getTasksByPlantId(plantId),
        getLogsByPlantId(plantId),
      ]);

      setPlant(nextPlant);
      setTasks(nextTasks);
      setLogs(nextLogs);
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
      setErrorMessage(null);
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
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось отметить задачу выполненной.'));
    } finally {
      setBusyTaskId(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Удалить растение?',
      'Карточка растения, задачи по уходу и журнал действий будут удалены локально с устройства.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
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

  const guideEntry = useMemo(
    () => (plant ? getPlantGuideEntryByName(plant.species) : null),
    [plant]
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
          })
        : null,
    [guideEntry, logs, plant, riskAssessment, tasks]
  );
  const activeTasks = useMemo(
    () => tasks.filter((task) => task.isCompleted === 0),
    [tasks]
  );
  const conditionTags = useMemo(
    () => (plant ? parseConditionTags(plant.conditionTags) : []),
    [plant]
  );
  const nextWateringDate =
    activeTasks.find((task) => task.type === 'watering')?.scheduledDate ??
    (plant ? getNextWateringDate(plant.lastWateringDate, plant.wateringIntervalDays) : null);
  const riskReasons = riskAssessment?.reasons.slice(0, 3) ?? [];
  const priorityChecks = recommendation?.priorityChecks.slice(0, 3) ?? [];
  const highlights = recommendation?.highlights.slice(0, 2) ?? [];
  const displayedLogs = logs.slice(0, 12);

  if (loading && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
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
            <Button
              onPress={() =>
                router.push({
                  pathname: '/plant/edit/[id]',
                  params: { id: plant.id },
                } as unknown as Href)
              }
              title="Изм."
            />
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {plant.photoUri ? (
          <Image source={{ uri: plant.photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderTitle}>Фото не добавлено</Text>
            <Text style={styles.photoPlaceholderSubtitle}>
              Можно прикрепить изображение на экране редактирования.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantSpecies}>{plant.species}</Text>
            </View>
            <RiskBadge level={riskAssessment.riskLevel} />
          </View>

          <Text style={styles.summaryText}>{riskAssessment.summary}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Обновлено: {formatDateTime(plant.updatedAt)}</Text>
            <Text style={styles.metaText}>Интервал полива: {plant.wateringIntervalDays} дн.</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Последний полив</Text>
              <Text style={styles.infoValue}>{formatDisplayDate(plant.lastWateringDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Следующий полив</Text>
              <Text style={styles.infoValue}>{formatTaskDate(nextWateringDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Последний осмотр</Text>
              <Text style={styles.infoValue}>{formatDisplayDate(plant.lastInspectionDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Справочный полив</Text>
              <Text style={styles.infoValue}>
                {guideEntry
                  ? `Примерно раз в ${guideEntry.recommendedWateringIntervalDays} дн.`
                  : 'Нет данных'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <SectionTitle title="Краткая рекомендация" />
          {highlights.length > 0 ? (
            renderPlainList(highlights, styles.bodyText)
          ) : (
            <Text style={styles.bodyText}>
              Данных достаточно только для общего профилактического ухода.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <SectionTitle title="Что проверить сейчас" />
          {priorityChecks.length > 0 ? (
            renderPlainList(priorityChecks, styles.bodyText)
          ) : (
            <Text style={styles.bodyText}>
              Срочных проверок нет. Поддерживайте текущий режим и периодически осматривайте растение.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <SectionTitle title="Состояние и условия" />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Освещение</Text>
              <Text style={styles.infoValue}>{plant.lightCondition || 'Не указано'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Влажность</Text>
              <Text style={styles.infoValue}>{plant.humidityCondition || 'Не указано'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Температура</Text>
              <Text style={styles.infoValue}>{plant.roomTemperature || 'Не указано'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Комментарий по уходу</Text>
              <Text style={styles.infoValue}>{plant.customCareComment || 'Не указан'}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Статус растения</Text>
          {conditionTags.length > 0 ? (
            <View style={styles.tagWrap}>
              {conditionTags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{getHealthTagLabel(tag)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>Симптомы пока не отмечены.</Text>
          )}

          <Text style={styles.sectionLabel}>Ключевые причины риска</Text>
          {riskReasons.length > 0 ? (
            renderPlainList(riskReasons, styles.bodyText)
          ) : (
            <Text style={styles.bodyText}>Выраженных факторов риска по текущим данным не найдено.</Text>
          )}

          <Text style={styles.sectionLabel}>Заметки</Text>
          <Text style={styles.bodyText}>{plant.notes || 'Заметки не добавлены.'}</Text>
        </View>

        <View style={styles.card}>
          <SectionTitle title="Быстрые действия" />

          <Pressable
            disabled={busy}
            onPress={() => {
              void handleMarkWatered();
            }}
            style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? 'Сохраняем...' : 'Отметить как полито'}
            </Text>
          </Pressable>

          <View style={styles.buttonSpacer} />

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/plant/health/[id]',
                params: { id: plant.id },
              } as unknown as Href)
            }
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Состояние растения</Text>
          </Pressable>

          <View style={styles.buttonSpacer} />

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/plant/recommendations/[id]',
                params: { id: plant.id },
              } as unknown as Href)
            }
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Рекомендации</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <SectionTitle title="Ближайшие задачи" />
          <QuickActionButtons
            busyTaskId={busyTaskId}
            onComplete={(task) => {
              void handleCompleteTask(task);
            }}
            tasks={activeTasks.slice(0, 3)}
          />

          {activeTasks.length === 0 ? (
            <Text style={styles.bodyText}>Активных задач сейчас нет.</Text>
          ) : (
            <View style={styles.compactTaskList}>
              {activeTasks.slice(0, 4).map((task) => (
                <View key={task.id} style={styles.compactTaskItem}>
                  <Text style={styles.compactTaskType}>{formatCareType(task.type)}</Text>
                  <Text style={styles.compactTaskDate}>{formatTaskDate(task.scheduledDate)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <SectionTitle title="Все задачи по уходу" />
        {tasks.length === 0 ? (
          <EmptyState
            description="Для этого растения пока нет сохранённых задач."
            title="Задачи отсутствуют"
          />
        ) : (
          tasks.map((task) => (
            <CareTaskCard
              key={task.id}
              completing={busyTaskId === task.id}
              onComplete={() => {
                void handleCompleteTask(task);
              }}
              showPlantName={false}
              task={task}
            />
          ))
        )}

        <SectionTitle title="История действий" />
        {displayedLogs.length === 0 ? (
          <EmptyState
            description="После первого выполненного действия здесь появится журнал ухода по растению."
            title="История пока пуста"
          />
        ) : (
          displayedLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <Text style={styles.logTitle}>{formatDisplayDate(log.actionDate)}</Text>
              <Text style={styles.logType}>{formatCareType(log.actionType)}</Text>
              <Text style={styles.logComment}>{log.comment || 'Комментарий не указан.'}</Text>
            </View>
          ))
        )}

        <Pressable
          disabled={busy}
          onPress={confirmDelete}
          style={({ pressed }) => [styles.dangerButton, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.dangerButtonText}>Удалить растение</Text>
        </Pressable>
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
  photo: {
    borderRadius: 20,
    height: 240,
    marginBottom: 16,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#edf3ed',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    height: 240,
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  photoPlaceholderTitle: {
    color: '#163020',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  photoPlaceholderSubtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  plantName: {
    color: '#163020',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  plantSpecies: {
    color: '#667085',
    fontSize: 15,
  },
  summaryText: {
    color: '#163020',
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  metaText: {
    color: '#667085',
    fontSize: 12,
  },
  infoGrid: {
    gap: 12,
    marginTop: 16,
  },
  infoItem: {
    backgroundColor: '#f7faf7',
    borderRadius: 14,
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
    marginBottom: 6,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  tag: {
    backgroundColor: '#edf7ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#edf7ef',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#2f6f3e',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonSpacer: {
    height: 10,
  },
  compactTaskList: {
    marginTop: 12,
  },
  compactTaskItem: {
    alignItems: 'center',
    borderTopColor: '#e4ebe3',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  compactTaskType: {
    color: '#163020',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  compactTaskDate: {
    color: '#667085',
    fontSize: 13,
    marginLeft: 12,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 50,
  },
  dangerButtonText: {
    color: '#c2410c',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  logTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  logType: {
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  logComment: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 20,
  },
});
