import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RiskBadge } from '@/components/RiskBadge';
import { formatDateLabel } from '@/lib/date';
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
          <Text style={styles.metaLabel}>Следующий полив</Text>
          <Text style={styles.metaValue}>{formatDateLabel(plant.nextWateringDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Просроченные задачи</Text>
          <Text style={[styles.metaValue, plant.overdueTaskCount > 0 && styles.overdueValue]}>
            {plant.overdueTaskCount}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.badge, plant.isOverdue && styles.overdueBadge]}>
          <Text style={[styles.badgeText, plant.isOverdue && styles.overdueBadgeText]}>
            {plant.isOverdue ? 'Требует внимания' : 'Уход по плану'}
          </Text>
        </View>
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
    fontSize: 13,
    marginBottom: 4,
  },
  metaValue: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '600',
  },
  overdueValue: {
    color: '#c2410c',
  },
  statusRow: {
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
});
