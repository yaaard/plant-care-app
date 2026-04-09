import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
};

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  title: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  value: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
});
