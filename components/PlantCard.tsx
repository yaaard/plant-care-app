import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RiskBadge } from '@/components/RiskBadge';
import { formatCareType, formatShortDate, formatTaskDate } from '@/lib/formatters';
import type { PlantListItem } from '@/types/plant';

type PlantCardProps = {
  plant: PlantListItem;
  onPress?: () => void;
};

export function PlantCard({ plant, onPress }: PlantCardProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{plant.name}</Text>
          <Text style={styles.subtitle}>{plant.species}</Text>
        </View>
        <RiskBadge compact level={plant.riskLevel} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Ближайшая задача</Text>
          <Text style={styles.metaValue}>
            {plant.nextTaskType ? formatCareType(plant.nextTaskType) : 'Нет активных задач'}
          </Text>
          <Text style={styles.metaHint}>
            {plant.nextTaskDate ? formatTaskDate(plant.nextTaskDate) : 'Будет рассчитана автоматически'}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Следующий полив</Text>
          <Text style={styles.metaValue}>{formatShortDate(plant.nextWateringDate)}</Text>
          <Text style={[styles.metaHint, plant.overdueTaskCount > 0 && styles.attentionText]}>
            Просроченных задач: {plant.overdueTaskCount}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={[styles.badge, plant.isOverdue && styles.overdueBadge]}>
          <Text style={[styles.badgeText, plant.isOverdue && styles.overdueBadgeText]}>
            {plant.isOverdue ? 'Требует внимания' : 'Уход по плану'}
          </Text>
        </View>
        <Text style={styles.updatedText}>Обновлено: {formatShortDate(plant.updatedAt.slice(0, 10), '—')}</Text>
      </View>
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
  pressed: {
    opacity: 0.92,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#163020',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    color: '#667085',
    fontSize: 12,
    marginBottom: 4,
  },
  metaValue: {
    color: '#163020',
    fontSize: 15,
    fontWeight: '700',
  },
  metaHint: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  attentionText: {
    color: '#c2410c',
    fontWeight: '600',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#edf7ef',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#2f6f3e',
    fontSize: 12,
    fontWeight: '700',
  },
  overdueBadge: {
    backgroundColor: '#fff1e8',
  },
  overdueBadgeText: {
    color: '#c2410c',
  },
  updatedText: {
    color: '#667085',
    fontSize: 12,
    marginLeft: 12,
  },
});
