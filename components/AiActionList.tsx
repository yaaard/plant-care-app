import { StyleSheet, Text, View } from 'react-native';

import { AiActionCard } from '@/components/AiActionCard';
import { AppTheme } from '@/constants/theme';
import type { AiAction } from '@/types/ai-action';

type Props = {
  actions: AiAction[];
  onApply: (action: AiAction) => void;
  applyingActionId?: string | null;
  appliedActionIds?: string[];
  hiddenActionIds?: string[];
  hideApplied?: boolean;
  title?: string;
  emptyText?: string | null;
};

export function AiActionList({
  actions,
  onApply,
  applyingActionId = null,
  appliedActionIds = [],
  hiddenActionIds = [],
  hideApplied = false,
  title = 'Рекомендуемые действия',
  emptyText = null,
}: Props) {
  const hiddenIds = new Set(hiddenActionIds);
  const appliedIds = new Set(appliedActionIds);
  const visibleActions = actions.filter((action) => {
    if (hiddenIds.has(action.id)) {
      return false;
    }

    if (hideApplied && appliedIds.has(action.id)) {
      return false;
    }

    return true;
  });

  if (visibleActions.length === 0) {
    return emptyText ? <Text style={styles.emptyText}>{emptyText}</Text> : null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.stack}>
        {visibleActions.map((action) => (
          <AiActionCard
            key={action.id}
            action={action}
            applied={appliedIds.has(action.id)}
            applying={applyingActionId === action.id}
            onApply={onApply}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  stack: {
    marginTop: 2,
  },
  emptyText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
});
