import { StyleSheet, Text, View } from 'react-native';

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
          • {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  warningCard: {
    backgroundColor: '#fff7f1',
    borderColor: '#f3c2a2',
  },
  successCard: {
    backgroundColor: '#f3faf4',
    borderColor: '#cfe5d3',
  },
  title: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  content: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
  },
  item: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});
