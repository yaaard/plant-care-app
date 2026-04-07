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
  Text,
  View,
} from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { CareTaskCard } from '@/components/CareTaskCard';
import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { CARE_TYPE_LABELS } from '@/constants/careTypes';
import { getConditionTagLabel, getPlantGuideEntryByName } from '@/constants/plantGuide';
import { formatDateLabel, getNextWateringDate } from '@/lib/date';
import { getLogsByPlantId } from '@/lib/logs-repo';
import { deletePlant, getPlantById, markPlantAsWatered } from '@/lib/plants-repo';
import { getRecommendationHighlights } from '@/lib/recommendations';
import { getTasksByPlantId } from '@/lib/tasks-repo';
import { getErrorMessage } from '@/lib/validators';
import type { CareLog } from '@/types/log';
import { parseConditionTags, type Plant } from '@/types/plant';
import type { CareTask } from '@/types/task';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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

  const confirmDelete = () => {
    Alert.alert(
      'Удалить растение?',
      'Карточка растения, связанные задачи и журнал действий будут удалены локально с устройства.',
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

  const nextWateringDate =
    tasks.find((task) => task.isCompleted === 0)?.scheduledDate ??
    (plant ? getNextWateringDate(plant.lastWateringDate, plant.wateringIntervalDays) : null);
  const guideEntry = useMemo(
    () => (plant ? getPlantGuideEntryByName(plant.species) : null),
    [plant]
  );
  const recommendationHighlights = useMemo(
    () => (plant ? getRecommendationHighlights(plant, guideEntry) : []),
    [guideEntry, plant]
  );
  const conditionTags = useMemo(
    () => (plant ? parseConditionTags(plant.conditionTags) : []),
    [plant]
  );

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

  if (!plant) {
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
            <Text style={styles.photoPlaceholderText}>Фото не добавлено</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.plantName}>{plant.name}</Text>
          <Text style={styles.plantSpecies}>{plant.species}</Text>
          {guideEntry ? (
            <Text style={styles.referenceText}>
              Справочный режим: полив примерно раз в {guideEntry.recommendedWateringIntervalDays} дн.
            </Text>
          ) : null}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Последний полив</Text>
              <Text style={styles.infoValue}>{formatDateLabel(plant.lastWateringDate)}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Интервал</Text>
              <Text style={styles.infoValue}>{plant.wateringIntervalDays} дн.</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Следующий полив</Text>
              <Text style={styles.infoValue}>{formatDateLabel(nextWateringDate)}</Text>
            </View>
          </View>

          <Text style={styles.notesLabel}>Условия в комнате</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Освещение</Text>
              <Text style={styles.infoValue}>{formatDateLabel(plant.lightCondition || null)}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Влажность</Text>
              <Text style={styles.infoValue}>
                {formatDateLabel(plant.humidityCondition || null)}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Температура</Text>
              <Text style={styles.infoValue}>
                {formatDateLabel(plant.roomTemperature || null)}
              </Text>
            </View>
          </View>

          <Text style={styles.notesLabel}>Признаки состояния</Text>
          {conditionTags.length > 0 ? (
            <View style={styles.tagWrap}>
              {conditionTags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{getConditionTagLabel(tag)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.notesValue}>Пока не отмечены.</Text>
          )}

          <Text style={styles.notesLabel}>Комментарий для анализа</Text>
          <Text style={styles.notesValue}>
            {plant.customCareComment || 'Пока нет дополнительного комментария.'}
          </Text>

          <Text style={styles.notesLabel}>Заметки</Text>
          <Text style={styles.notesValue}>
            {plant.notes || 'Пока нет дополнительных заметок.'}
          </Text>
        </View>

        <View style={[styles.card, styles.recommendationCard]}>
          <Text style={styles.notesLabel}>Краткая рекомендация</Text>
          {recommendationHighlights.map((item) => (
            <Text key={item} style={styles.highlightText}>
              - {item}
            </Text>
          ))}

          <Pressable
            disabled={busy}
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

        <View style={styles.actionsRow}>
          <Pressable
            disabled={busy}
            onPress={() => {
              void handleMarkWatered();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || busy) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? 'Сохраняем...' : 'Отметить как полито'}
            </Text>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() =>
              router.push({
                pathname: '/plant/edit/[id]',
                params: { id: plant.id },
              } as unknown as Href)
            }
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Редактировать</Text>
          </Pressable>
        </View>

        <Pressable
          disabled={busy}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.dangerButton,
            (pressed || busy) && styles.pressed,
          ]}
        >
          <Text style={styles.dangerButtonText}>Удалить растение</Text>
        </Pressable>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <SectionTitle title="Задачи по уходу" />
        {tasks.length === 0 ? (
          <EmptyState
            description="Для этого растения пока нет сохранённых задач."
            title="Задачи отсутствуют"
          />
        ) : (
          tasks.map((task) => <CareTaskCard key={task.id} showPlantName={false} task={task} />)
        )}

        <SectionTitle title="История действий" />
        {logs.length === 0 ? (
          <EmptyState
            description="После первого полива здесь появится журнал действий по растению."
            title="История пока пуста"
          />
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <Text style={styles.logTitle}>
                {CARE_TYPE_LABELS[log.actionType]} - {log.actionDate}
              </Text>
              <Text style={styles.logComment}>
                {log.comment || 'Комментарий не указан.'}
              </Text>
            </View>
          ))
        )}
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
    backgroundColor: '#f0f3ef',
    borderRadius: 20,
    height: 240,
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoPlaceholderText: {
    color: '#667085',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
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
    marginBottom: 8,
  },
  referenceText: {
    color: '#2f6f3e',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  infoGrid: {
    gap: 12,
    marginBottom: 18,
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
  notesLabel: {
    color: '#163020',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  notesValue: {
    color: '#163020',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
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
  recommendationCard: {
    gap: 8,
  },
  highlightText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
  },
  actionsRow: {
    gap: 12,
    marginBottom: 12,
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
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 14,
    justifyContent: 'center',
    marginBottom: 18,
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
    marginBottom: 8,
  },
  logComment: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 20,
  },
});
