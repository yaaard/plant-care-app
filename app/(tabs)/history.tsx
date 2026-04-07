import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { FilterChips, type FilterChipOption } from '@/components/FilterChips';
import { SearchBar } from '@/components/SearchBar';
import { SectionTitle } from '@/components/SectionTitle';
import { CARE_TYPE_VALUES, type CareType } from '@/constants/careTypes';
import { useLogs } from '@/hooks/useLogs';
import { formatCareType, formatDisplayDate } from '@/lib/formatters';

type HistoryFilterKey = 'all' | CareType;

const FILTER_OPTIONS: FilterChipOption<HistoryFilterKey>[] = [
  { key: 'all', label: 'Все' },
  ...CARE_TYPE_VALUES.map((type) => ({
    key: type,
    label: formatCareType(type),
  })),
];

export default function HistoryScreen() {
  const { logs, loading, error, reload } = useLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKey, setFilterKey] = useState<HistoryFilterKey>('all');
  const deferredQuery = useDeferredValue(searchQuery);

  const visibleLogs = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesQuery =
        !normalizedQuery ||
        [log.plantName, log.plantSpecies, log.comment]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesType = filterKey === 'all' || log.actionType === filterKey;

      return matchesQuery && matchesType;
    });
  }, [deferredQuery, filterKey, logs]);

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
        data={visibleLogs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            description={
              logs.length === 0
                ? 'После первых выполненных действий здесь появится локальная история ухода по всем растениям.'
                : 'Попробуйте изменить поиск или фильтр по типу действия.'
            }
            title={logs.length === 0 ? 'Журнал пока пуст' : 'По вашему запросу ничего не найдено'}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionTitle title="История ухода" />

            <SearchBar
              onChangeText={setSearchQuery}
              placeholder="Поиск по растению или комментарию"
              value={searchQuery}
            />

            <FilterChips
              label="Тип действия"
              onSelect={setFilterKey}
              options={FILTER_OPTIONS}
              selectedKey={filterKey}
            />

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
              {formatCareType(item.actionType)} • {formatDisplayDate(item.actionDate)}
            </Text>
            <Text style={styles.species}>{item.plantSpecies}</Text>
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
    color: '#435249',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  species: {
    color: '#667085',
    fontSize: 13,
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
