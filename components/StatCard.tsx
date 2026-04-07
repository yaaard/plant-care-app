import { StyleSheet, Text, View } from 'react-native';

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
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  title: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 8,
  },
  value: {
    color: '#163020',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#435249',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
});
