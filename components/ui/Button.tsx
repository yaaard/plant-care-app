import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  compact?: boolean;
};

export function Button({
  label,
  onPress,
  icon,
  tone = 'primary',
  disabled = false,
  compact = false,
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        tone === 'primary' && styles.primary,
        tone === 'secondary' && styles.secondary,
        tone === 'ghost' && styles.ghost,
        tone === 'danger' && styles.danger,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text
        style={[
          styles.label,
          tone === 'primary' && styles.primaryLabel,
          tone === 'secondary' && styles.secondaryLabel,
          tone === 'ghost' && styles.ghostLabel,
          tone === 'danger' && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: AppTheme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: AppTheme.colors.primary,
  },
  secondary: {
    backgroundColor: AppTheme.colors.primarySoft,
  },
  ghost: {
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  danger: {
    backgroundColor: AppTheme.colors.dangerSoft,
  },
  pressed: {
    opacity: 0.88,
  },
  iconWrap: {
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
    color: AppTheme.colors.white,
  },
  secondaryLabel: {
    color: AppTheme.colors.primaryStrong,
  },
  ghostLabel: {
    color: AppTheme.colors.text,
  },
  dangerLabel: {
    color: AppTheme.colors.danger,
  },
});
