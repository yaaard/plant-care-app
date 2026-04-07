import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { CARE_TYPE_LABELS } from '@/constants/careTypes';
import { useLogs } from '@/hooks/useLogs';

export default function HistoryScreen() {
  const { logs, loading, error, reload } = useLogs();

  if (loading && logs.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Загружаем журнал действий...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={logs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            description="После первого отмеченного полива здесь появится история действий по всем растениям."
            title="Журнал пока пуст"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionTitle title="История ухода" />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        onRefresh={() => {
          void reload();
        }}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.plantName}</Text>
            <Text style={styles.subtitle}>
              {CARE_TYPE_LABELS[item.actionType]} - {item.actionDate}
            </Text>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  title: {
    color: '#163020',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    marginBottom: 8,
  },
  comment: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    marginBottom: 8,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centeredText: {
    color: '#163020',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
});
