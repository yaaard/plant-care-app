import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { CareTaskCard } from '@/components/CareTaskCard';
import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { useTasks } from '@/hooks/useTasks';

export default function ScheduleScreen() {
  const router = useRouter();
  const { tasks, loading, error, reload } = useTasks();

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Загружаем ближайшие задачи...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={tasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            description="Когда вы добавите растения, здесь автоматически появятся все невыполненные задачи полива."
            title="Задач пока нет"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionTitle title="График ухода" />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        onRefresh={() => {
          void reload();
        }}
        refreshing={loading}
        renderItem={({ item }) => (
          <CareTaskCard
            onPress={() =>
              router.push({
                pathname: '/plant/[id]',
                params: { id: item.plantId },
              } as unknown as Href)
            }
            task={item}
          />
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
