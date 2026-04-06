import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARE_TYPE_LABELS } from '@/constants/careTypes';
import { isDateBeforeToday } from '@/lib/date';
import type { CareTask, CareTaskWithPlant } from '@/types/task';

type CareTaskCardProps = {
  task: CareTask | CareTaskWithPlant;
  onPress?: () => void;
  showPlantName?: boolean;
};

function hasPlantInfo(task: CareTask | CareTaskWithPlant): task is CareTaskWithPlant {
  return 'plantName' in task;
}

export function CareTaskCard({
  task,
  onPress,
  showPlantName = true,
}: CareTaskCardProps) {
  const overdue = task.isCompleted === 0 && isDateBeforeToday(task.scheduledDate);

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        overdue && styles.overdueCard,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{CARE_TYPE_LABELS[task.type]}</Text>
        <Text style={[styles.status, overdue && styles.overdueStatus]}>
          {task.isCompleted ? 'Выполнено' : overdue ? 'Просрочено' : 'Активно'}
        </Text>
      </View>

      {showPlantName && hasPlantInfo(task) ? (
        <Text style={styles.plantName}>
          {task.plantName} • {task.plantSpecies}
        </Text>
      ) : null}

      <Text style={styles.dateLabel}>Дата задачи</Text>
      <Text style={styles.dateValue}>{task.scheduledDate}</Text>

      {task.isCompleted && task.completedAt ? (
        <Text style={styles.completedText}>Завершено: {task.completedAt.slice(0, 10)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  overdueCard: {
    backgroundColor: '#fff7f1',
    borderColor: '#f5c6a5',
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#163020',
    fontSize: 17,
    fontWeight: '700',
  },
  status: {
    color: '#2f6f3e',
    fontSize: 12,
    fontWeight: '700',
  },
  overdueStatus: {
    color: '#c2410c',
  },
  plantName: {
    color: '#667085',
    fontSize: 14,
    marginBottom: 10,
  },
  dateLabel: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 4,
  },
  dateValue: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '600',
  },
  completedText: {
    color: '#667085',
    fontSize: 12,
    marginTop: 8,
  },
});
