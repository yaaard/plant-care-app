import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { RiskBadge } from '@/components/RiskBadge';
import { AppTheme } from '@/constants/theme';
import { formatCareType, formatShortDate } from '@/lib/formatters';
import type { PlantListItem } from '@/types/plant';

type PlantCardProps = {
  plant: PlantListItem;
  onPress?: () => void;
};

function MetaPill({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <View style={[styles.metaPill, tone === 'warning' && styles.metaPillWarning]}>
      <Ionicons
        color={tone === 'warning' ? '#a65a2c' : AppTheme.colors.primaryStrong}
        name={icon}
        size={14}
      />
      <View style={styles.metaCopy}>
        <Text style={[styles.metaLabel, tone === 'warning' && styles.metaLabelWarning]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.metaValue, tone === 'warning' && styles.metaValueWarning]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function PlantCard({ plant, onPress }: PlantCardProps) {
  const nextTaskText = plant.nextTaskType ? formatCareType(plant.nextTaskType) : 'Пока без задач';
  const nextWateringText = formatShortDate(plant.nextWateringDate, 'Не задан');
  const overdueText = plant.overdueTaskCount > 0 ? `${plant.overdueTaskCount} проср.` : 'По плану';

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.mediaWrap}>
          {plant.photoUri ? (
            <Image source={{ uri: plant.photoUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons color={AppTheme.colors.primaryStrong} name="leaf-outline" size={26} />
            </View>
          )}
        </View>

        <View style={styles.main}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text numberOfLines={1} style={styles.title}>
                {plant.name}
              </Text>
              <Text numberOfLines={1} style={styles.subtitle}>
                {plant.species}
              </Text>
            </View>
            <RiskBadge compact level={plant.riskLevel} />
          </View>

          <View style={styles.featureGrid}>
            <MetaPill icon="sparkles-outline" label="Следующее" value={nextTaskText} />
            <MetaPill icon="water-outline" label="Полив" value={nextWateringText} />
            <MetaPill
              icon="alert-circle-outline"
              label="Статус"
              tone={plant.overdueTaskCount > 0 ? 'warning' : 'default'}
              value={overdueText}
            />
          </View>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.updatedText}>
          Обновлено {formatShortDate(plant.updatedAt.slice(0, 10), '—')}
        </Text>
        <View style={styles.ctaChip}>
          <Text style={styles.ctaText}>Открыть</Text>
          <Ionicons color={AppTheme.colors.primaryStrong} name="arrow-forward" size={14} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 14,
    padding: AppTheme.spacing.md,
  },
  pressed: {
    opacity: 0.97,
    transform: [{ scale: 0.994 }],
  },
  topRow: {
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
  },
  mediaWrap: {
    width: 92,
  },
  image: {
    borderRadius: 22,
    height: 112,
    width: 92,
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: 22,
    height: 112,
    justifyContent: 'center',
    width: 92,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AppTheme.spacing.sm,
  },
  titleBlock: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  featureGrid: {
    gap: AppTheme.spacing.xs,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: 'row',
    gap: AppTheme.spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaPillWarning: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
  metaCopy: {
    flex: 1,
  },
  metaLabel: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaLabelWarning: {
    color: '#a65a2c',
  },
  metaValue: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  metaValueWarning: {
    color: '#8f4f27',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: AppTheme.spacing.md,
    paddingTop: AppTheme.spacing.sm,
  },
  updatedText: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
  },
  ctaChip: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
  },
});
