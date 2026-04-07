import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { CareTaskCard } from '@/components/CareTaskCard';
import { EmptyState } from '@/components/EmptyState';
import { FilterChips, type FilterChipOption } from '@/components/FilterChips';
import { SectionTitle } from '@/components/SectionTitle';
import { SortSelector } from '@/components/SortSelector';
import { CARE_TYPE_VALUES, type CareType, getCareTypeLabel } from '@/constants/careTypes';
import { useTasks } from '@/hooks/useTasks';
import { todayString } from '@/lib/date';
import { completePlantTask } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';

type TaskFilterKey = 'all' | CareType;
type TaskSortKey = 'date' | 'type' | 'overdue';

const FILTER_OPTIONS: FilterChipOption<TaskFilterKey>[] = [
  { key: 'all', label: 'Все' },
  ...CARE_TYPE_VALUES.map((type) => ({
    key: type,
    label: getCareTypeLabel(type),
  })),
];

const SORT_OPTIONS: FilterChipOption<TaskSortKey>[] = [
  { key: 'date', label: 'По дате' },
  { key: 'type', label: 'По типу' },
  { key: 'overdue', label: 'Просроченные выше' },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const { tasks, loading, error, reload } = useTasks();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<TaskFilterKey>('all');
  const [sortKey, setSortKey] = useState<TaskSortKey>('date');

  const today = todayString();
  const visibleTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => (filterKey === 'all' ? true : task.type === filterKey))
      .sort((left, right) => {
        if (sortKey === 'type') {
          const typeCompare = getCareTypeLabel(left.type).localeCompare(
            getCareTypeLabel(right.type),
            'ru-RU'
          );
          return typeCompare !== 0
            ? typeCompare
            : left.scheduledDate.localeCompare(right.scheduledDate);
        }

        if (sortKey === 'overdue') {
          const leftOverdue = left.scheduledDate < today ? 1 : 0;
          const rightOverdue = right.scheduledDate < today ? 1 : 0;

          if (leftOverdue !== rightOverdue) {
            return rightOverdue - leftOverdue;
          }
        }

        return left.scheduledDate.localeCompare(right.scheduledDate);
      });
  }, [filterKey, sortKey, tasks, today]);

  const overdueCount = tasks.filter((task) => task.scheduledDate < today).length;

  const handleCompleteTask = async (taskId: string) => {
    setBusyTaskId(taskId);

    try {
      await completePlantTask(taskId);
      setActionError(null);
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Не удалось отметить задачу выполненной.'));
    } finally {
      setBusyTaskId(null);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Загружаем график ухода...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            description={
              tasks.length === 0
                ? 'Когда вы добавите растения, здесь автоматически появятся все невыполненные задачи по уходу.'
                : 'Попробуйте изменить фильтр по типу задачи.'
            }
            title={tasks.length === 0 ? 'Задач пока нет' : 'Под выбранный фильтр задач не найдено'}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionTitle title="График ухода" />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Сводка по задачам</Text>
              <Text style={styles.summaryText}>Всего активных задач: {tasks.length}</Text>
              <Text style={[styles.summaryText, overdueCount > 0 && styles.summaryAlert]}>
                Просрочено: {overdueCount}
              </Text>
            </View>

            <FilterChips
              label="Тип ухода"
              onSelect={setFilterKey}
              options={FILTER_OPTIONS}
              selectedKey={filterKey}
            />

            <SortSelector
              onSelect={setSortKey}
              options={SORT_OPTIONS}
              selectedKey={sortKey}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          </View>
        }
        onRefresh={() => {
          void reload();
        }}
        refreshing={loading}
        renderItem={({ item }) => (
          <CareTaskCard
            completing={busyTaskId === item.id}
            onComplete={() => {
              void handleCompleteTask(item.id);
            }}
            onPress={() =>
              router.push({
                pathname: '/plant/[id]',
                params: { id: item.plantId },
              } as unknown as Href)
            }
            task={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  summaryTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    color: '#435249',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  summaryAlert: {
    color: '#c2410c',
    fontWeight: '700',
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    marginBottom: 8,
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
