import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { CareTaskCard } from '@/components/CareTaskCard';
import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { CARE_TYPE_VALUES, getCareTypeLabel } from '@/constants/careTypes';
import { useTasks } from '@/hooks/useTasks';
import { todayString } from '@/lib/date';
import { completePlantTask } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';
import { useState } from 'react';

export default function ScheduleScreen() {
  const router = useRouter();
  const { tasks, loading, error, reload } = useTasks();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const overdueCount = tasks.filter((task) => task.scheduledDate < todayString()).length;
  const taskCounts = CARE_TYPE_VALUES.map((type) => ({
    type,
    count: tasks.filter((task) => task.type === type).length,
  })).filter((item) => item.count > 0);

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
        data={tasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            description="Когда вы добавите растения, здесь автоматически появятся все невыполненные задачи по уходу."
            title="Задач пока нет"
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
              {taskCounts.length > 0 ? (
                <View style={styles.summaryChips}>
                  {taskCounts.map((item) => (
                    <View key={item.type} style={styles.summaryChip}>
                      <Text style={styles.summaryChipText}>
                        {getCareTypeLabel(item.type)}: {item.count}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

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
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  summaryChip: {
    backgroundColor: '#edf7ef',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryChipText: {
    color: '#2f6f3e',
    fontSize: 12,
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
