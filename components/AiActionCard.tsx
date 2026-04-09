import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';
import { getAiActionDescription, getAiActionTitle } from '@/lib/ai-actions';
import type { AiAction } from '@/types/ai-action';

type Props = {
  action: AiAction;
  applying?: boolean;
  applied?: boolean;
  onApply: (action: AiAction) => void;
};

function getActionIcon(type: AiAction['type']) {
  switch (type) {
    case 'create_task':
      return 'checkmark-circle-outline';
    case 'update_watering_interval':
      return 'water-outline';
    case 'mark_attention':
      return 'alert-circle-outline';
    case 'open_catalog_entry':
      return 'book-outline';
    case 'open_plant_details':
      return 'leaf-outline';
    case 'open_schedule':
      return 'calendar-outline';
    default:
      return 'sparkles-outline';
  }
}

export function AiActionCard({ action, applying = false, applied = false, onApply }: Props) {
  const title = getAiActionTitle(action);
  const description = getAiActionDescription(action);

  return (
    <View style={[styles.card, applied && styles.cardApplied]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, applied && styles.iconWrapApplied]}>
          <Ionicons
            color={applied ? AppTheme.colors.primaryStrong : AppTheme.colors.info}
            name={getActionIcon(action.type)}
            size={18}
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </View>

      <Pressable
        disabled={applying || applied}
        onPress={() => onApply(action)}
        style={({ pressed }) => [
          styles.button,
          applied ? styles.buttonApplied : styles.buttonDefault,
          (pressed || applying || applied) && styles.pressed,
        ]}
      >
        <Text style={[styles.buttonText, applied && styles.buttonTextApplied]}>
          {applied ? 'Действие выполнено' : applying ? 'Применяем...' : 'Применить'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  cardApplied: {
    backgroundColor: AppTheme.colors.successSoft,
    borderColor: '#cfe3d5',
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.infoSoft,
    borderRadius: AppTheme.radius.pill,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  iconWrapApplied: {
    backgroundColor: AppTheme.colors.primarySoft,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  description: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  button: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  buttonDefault: {
    backgroundColor: AppTheme.colors.primary,
  },
  buttonApplied: {
    backgroundColor: AppTheme.colors.primarySoft,
  },
  buttonText: {
    color: AppTheme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextApplied: {
    color: AppTheme.colors.primaryStrong,
  },
  pressed: {
    opacity: 0.92,
  },
});
