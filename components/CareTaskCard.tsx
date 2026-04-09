import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { RiskBadge } from '@/components/RiskBadge';
import { AppTheme } from '@/constants/theme';
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
  const statusLabel = task.isCompleted ? 'Выполнено' : overdue ? 'Просрочено' : 'Активно';

  return (
    <View style={[styles.card, overdue && styles.cardOverdue]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && onPress && styles.pressed]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Уход</Text>
            <Text style={styles.title}>{formatCareType(task.type)}</Text>
          </View>
          <View style={[styles.statusChip, overdue && styles.statusChipOverdue]}>
            <Text style={[styles.statusText, overdue && styles.statusTextOverdue]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          {showPlantName && hasPlantInfo(task) ? (
            <View style={styles.taskRow}>
              {task.plantPhotoUri ? (
                <Image source={{ uri: task.plantPhotoUri }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons color={AppTheme.colors.primaryStrong} name="leaf-outline" size={20} />
                </View>
              )}

              <View style={styles.taskRowBody}>
                <View style={styles.dateBlock}>
                  <Ionicons color={AppTheme.colors.primaryStrong} name="calendar-outline" size={16} />
                  <View style={styles.dateCopy}>
                    <Text style={styles.dateLabel}>Запланировано</Text>
                    <Text style={styles.dateValue}>{formatTaskDate(task.scheduledDate)}</Text>
                  </View>
                </View>

                <View style={styles.plantSummary}>
                  <View style={styles.plantCopy}>
                    <Text numberOfLines={1} style={styles.plantName}>
                      {task.plantName}
                    </Text>
                    <Text numberOfLines={1} style={styles.plantSpecies}>
                      {task.plantSpecies}
                    </Text>
                  </View>
                  <RiskBadge compact level={task.plantRiskLevel} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.dateBlock}>
              <Ionicons color={AppTheme.colors.primaryStrong} name="calendar-outline" size={16} />
              <View style={styles.dateCopy}>
                <Text style={styles.dateLabel}>Запланировано</Text>
                <Text style={styles.dateValue}>{formatTaskDate(task.scheduledDate)}</Text>
              </View>
            </View>
          )}

        </View>

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
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardOverdue: {
    borderColor: '#f1c8ae',
  },
  body: {
    padding: AppTheme.spacing.card,
  },
  pressed: {
    opacity: 0.94,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AppTheme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
  },
  kicker: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  statusChip: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusChipOverdue: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
  statusText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextOverdue: {
    color: '#a65a2c',
  },
  infoRow: {
    gap: AppTheme.spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    gap: AppTheme.spacing.sm,
  },
  thumbnail: {
    borderRadius: 16,
    height: 56,
    width: 56,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  taskRowBody: {
    flex: 1,
    gap: 10,
  },
  dateBlock: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: 'row',
    gap: AppTheme.spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateCopy: {
    flex: 1,
  },
  dateLabel: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateValue: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  plantSummary: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  plantCopy: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
  },
  plantName: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  plantSpecies: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  completedText: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    marginTop: AppTheme.spacing.sm,
  },
  completeButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: AppTheme.spacing.md,
  },
  completeButtonDisabled: {
    backgroundColor: '#dfe6df',
  },
  completeButtonText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 14,
    fontWeight: '700',
  },
});
