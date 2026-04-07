import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
      <Text style={[styles.title, tone === 'danger' && styles.dangerTitle]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  dangerCard: {
    backgroundColor: '#fff7f1',
    borderColor: '#f3c2a2',
  },
  title: {
    color: '#163020',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  dangerTitle: {
    color: '#c2410c',
  },
  description: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
  },
  content: {
    marginTop: 14,
  },
});
