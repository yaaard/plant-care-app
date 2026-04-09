import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type RecommendationCardProps = {
  title: string;
  content?: string;
  items?: string[];
  tone?: 'default' | 'warning' | 'success';
};

export function RecommendationCard({
  title,
  content,
  items = [],
  tone = 'default',
}: RecommendationCardProps) {
  const empty = !content && items.length === 0;

  if (empty) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        tone === 'warning' && styles.warningCard,
        tone === 'success' && styles.successCard,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
      {content ? <Text style={styles.content}>{content}</Text> : null}
      {items.map((item) => (
        <Text key={item} style={styles.item}>
          - {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  warningCard: {
    backgroundColor: AppTheme.colors.warningSoft,
    borderColor: '#efd49c',
  },
  successCard: {
    backgroundColor: AppTheme.colors.successSoft,
    borderColor: '#cfe5d7',
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  content: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  item: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});
