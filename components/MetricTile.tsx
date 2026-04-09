import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type MetricTileProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'primary' | 'accent';
};

export function MetricTile({ label, value, tone = 'default' }: MetricTileProps) {
  return (
    <View
      style={[
        styles.card,
        tone === 'primary' && styles.primaryCard,
        tone === 'accent' && styles.accentCard,
      ]}
    >
      <Text
        style={[
          styles.value,
          tone === 'primary' && styles.primaryValue,
          tone === 'accent' && styles.accentValue,
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          tone === 'primary' && styles.primaryLabel,
          tone === 'accent' && styles.accentLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 88,
    padding: 16,
  },
  primaryCard: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderColor: AppTheme.colors.primarySoft,
  },
  accentCard: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderColor: AppTheme.colors.accentSoft,
  },
  value: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  primaryValue: {
    color: AppTheme.colors.primaryStrong,
  },
  accentValue: {
    color: '#a8481f',
  },
  label: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  primaryLabel: {
    color: AppTheme.colors.primaryStrong,
  },
  accentLabel: {
    color: '#8f5730',
  },
});
