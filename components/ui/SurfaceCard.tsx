import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppTheme } from '@/constants/theme';

type SurfaceCardProps = {
  children: React.ReactNode;
  tone?: 'default' | 'soft' | 'muted' | 'accent';
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function SurfaceCard({
  children,
  tone = 'default',
  style,
  compact = false,
}: SurfaceCardProps) {
  return (
    <View
      style={[
        styles.card,
        compact && styles.compact,
        tone === 'soft' && styles.softCard,
        tone === 'muted' && styles.mutedCard,
        tone === 'accent' && styles.accentCard,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    padding: AppTheme.spacing.card,
  },
  compact: {
    padding: AppTheme.spacing.md,
  },
  softCard: {
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  mutedCard: {
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  accentCard: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
});
