import { Pressable, StyleSheet, Text, View } from 'react-native';

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

        {plant.isOverdue ? (
          <View style={[styles.badge, styles.overdueBadge]}>
            <Text style={[styles.badgeText, styles.overdueBadgeText]}>Просрочено</Text>
          </View>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>По плану</Text>
          </View>
        )}
      </View>

      <Text style={styles.metaLabel}>Следующий полив</Text>
      <Text style={styles.metaValue}>{formatDateLabel(plant.nextWateringDate)}</Text>
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
  badge: {
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
