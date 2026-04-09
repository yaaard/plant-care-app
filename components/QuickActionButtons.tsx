import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';
import { getCareTypeLabel } from '@/constants/careTypes';
import type { CareTask } from '@/types/task';

type QuickActionButtonsProps = {
  tasks: CareTask[];
  onComplete: (task: CareTask) => void;
  busyTaskId?: string | null;
};

export function QuickActionButtons({
  tasks,
  onComplete,
  busyTaskId = null,
}: QuickActionButtonsProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {tasks.map((task) => {
        const busy = busyTaskId === task.id;

        return (
          <Pressable
            key={task.id}
            disabled={busy}
            onPress={() => onComplete(task)}
            style={({ pressed }) => [
              styles.button,
              busy && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Сохраняем...' : `Отметить: ${getCareTypeLabel(task.type)}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.lg,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  buttonDisabled: {
    backgroundColor: '#dfeae2',
  },
  buttonText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
