import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type SettingSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
};

export function SettingSection({
  title,
  description,
  children,
  tone = 'default',
}: SettingSectionProps) {
  return (
    <View style={[styles.card, tone === 'danger' && styles.dangerCard]}>
      <View style={styles.header}>
        <View style={[styles.accent, tone === 'danger' && styles.dangerAccent]} />
        <Text style={[styles.title, tone === 'danger' && styles.dangerTitle]}>{title}</Text>
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.content}>{children}</View>
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
    marginBottom: 16,
    padding: 18,
  },
  dangerCard: {
    backgroundColor: AppTheme.colors.dangerSoft,
    borderColor: '#f1c9c3',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  accent: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.pill,
    height: 14,
    marginRight: 10,
    width: 48,
  },
  dangerAccent: {
    backgroundColor: AppTheme.colors.danger,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  dangerTitle: {
    color: AppTheme.colors.danger,
  },
  description: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  content: {
    marginTop: 14,
  },
});
