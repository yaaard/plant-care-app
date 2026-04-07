import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RiskBadge } from '@/components/RiskBadge';
import { formatCareType, formatTaskDate } from '@/lib/formatters';
import { isDateBeforeToday } from '@/lib/date';
import type { CareTask, CareTaskWithPlant } from '@/types/task';

type CareTaskCardProps = {
  task: CareTask | CareTaskWithPlant;
  onPress?: () => void;
  showPlantName?: boolean;
  onComplete?: (task: CareTask | CareTaskWithPlant) => void;
  completing?: boolean;
};

function hasPlantInfo(task: CareTask | CareTaskWithPlant): task is CareTaskWithPlant {
  return 'plantName' in task;
}

export function CareTaskCard({
  task,
  onPress,
  showPlantName = true,
  onComplete,
  completing = false,
}: CareTaskCardProps) {
  const overdue = task.isCompleted === 0 && isDateBeforeToday(task.scheduledDate);

  return (
    <View style={[styles.card, overdue && styles.overdueCard]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [pressed && onPress && styles.pressed]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{formatCareType(task.type)}</Text>
          <Text style={[styles.status, overdue && styles.overdueStatus]}>
            {task.isCompleted ? 'Выполнено' : overdue ? 'Просрочено' : 'Активно'}
          </Text>
        </View>

        {showPlantName && hasPlantInfo(task) ? (
          <View style={styles.plantRow}>
            <View style={styles.plantMeta}>
              <Text style={styles.plantName}>{task.plantName}</Text>
              <Text style={styles.plantSpecies}>{task.plantSpecies}</Text>
            </View>
            <RiskBadge compact level={task.plantRiskLevel} />
          </View>
        ) : null}

        <Text style={styles.dateLabel}>Срок выполнения</Text>
        <Text style={styles.dateValue}>{formatTaskDate(task.scheduledDate)}</Text>

        {task.isCompleted && task.completedAt ? (
          <Text style={styles.completedText}>Завершено: {task.completedAt.slice(0, 10)}</Text>
        ) : null}
      </Pressable>

      {!task.isCompleted && onComplete ? (
        <Pressable
          disabled={completing}
          onPress={() => onComplete(task)}
          style={({ pressed }) => [
            styles.completeButton,
            completing && styles.completeButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.completeButtonText}>
            {completing ? 'Сохраняем...' : 'Отметить выполненным'}
          </Text>
        </Pressable>
      ) : null}
    </View>
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
  plantRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  plantMeta: {
    flex: 1,
    marginRight: 12,
  },
  plantName: {
    color: '#163020',
    fontSize: 14,
    fontWeight: '600',
  },
  plantSpecies: {
    color: '#667085',
    fontSize: 13,
    marginTop: 2,
  },
  dateLabel: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 4,
  },
  dateValue: {
    color: '#163020',
    fontSize: 15,
    fontWeight: '600',
  },
  completedText: {
    color: '#667085',
    fontSize: 12,
    marginTop: 8,
  },
  completeButton: {
    alignItems: 'center',
    backgroundColor: '#edf7ef',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 44,
  },
  completeButtonDisabled: {
    backgroundColor: '#dfeae2',
  },
  completeButtonText: {
    color: '#2f6f3e',
    fontSize: 14,
    fontWeight: '700',
  },
});
