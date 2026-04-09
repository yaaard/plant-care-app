import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type InlineBannerProps = {
  text: string;
  tone?: 'success' | 'error' | 'info';
};

export function InlineBanner({ text, tone = 'info' }: InlineBannerProps) {
  const palette =
    tone === 'success'
      ? AppTheme.status.success
      : tone === 'error'
        ? AppTheme.status.danger
        : AppTheme.status.info;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    marginBottom: AppTheme.spacing.md,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.sm,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
