import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type SectionTitleProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionTitle({ title, actionLabel, onActionPress }: SectionTitleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleWrap}>
        <View style={styles.markerWrap}>
          <View style={styles.marker} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  markerWrap: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.md,
    height: 28,
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  marker: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.pill,
    height: 12,
    width: 4,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  actionButton: {
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.pill,
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  action: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
