import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { FilterChips, type FilterChipOption } from '@/components/FilterChips';
import { SearchBar } from '@/components/SearchBar';
import { SectionTitle } from '@/components/SectionTitle';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
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
        [log.plantName, log.plantSpecies, log.comment].join(' ').toLowerCase().includes(normalizedQuery);

      const matchesType = filterKey === 'all' || log.actionType === filterKey;
      return matchesQuery && matchesType;
    });
  }, [deferredQuery, filterKey, logs]);

  if (loading && logs.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
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
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            description={
              logs.length === 0
                ? 'После первых выполненных действий здесь появится история ухода.'
                : 'Попробуйте изменить поиск или фильтр.'
            }
            title={logs.length === 0 ? 'Журнал пока пуст' : 'Ничего не найдено'}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Журнал ухода</Text>
              <Text style={styles.subtitle}>{visibleLogs.length} событий</Text>
            </View>

            <SurfaceCard compact style={styles.filterCard}>
              <SectionTitle title="Найти событие" />
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
            </SurfaceCard>
          </View>
        }
        onRefresh={() => {
          void reload();
        }}
        refreshing={loading}
        renderItem={({ item, index }) => (
          <View style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot} />
              {index !== visibleLogs.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <SurfaceCard compact style={styles.logCard}>
              <Text style={styles.logTitle}>{item.plantName}</Text>
              <Text style={styles.logMeta}>
                {formatCareType(item.actionType)} • {formatDisplayDate(item.actionDate)}
              </Text>
              <Text style={styles.logSpecies}>{item.plantSpecies}</Text>
              {item.comment ? <Text style={styles.logComment}>{item.comment}</Text> : null}
            </SurfaceCard>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  listContent: {
    padding: AppTheme.spacing.page,
    paddingBottom: AppTheme.spacing.xxxl,
  },
  header: {
    marginBottom: AppTheme.spacing.sm,
  },
  titleRow: {
    marginBottom: 14,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  filterCard: {
    marginBottom: 10,
  },
  errorText: {
    color: AppTheme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  timelineRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineRail: {
    alignItems: 'center',
    marginRight: 12,
    width: 18,
  },
  timelineDot: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 999,
    height: 10,
    marginTop: 16,
    width: 10,
  },
  timelineLine: {
    backgroundColor: AppTheme.colors.strokeStrong,
    flex: 1,
    marginTop: 6,
    width: 2,
  },
  logCard: {
    flex: 1,
    marginBottom: 12,
  },
  logTitle: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  logMeta: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  logSpecies: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    marginTop: 4,
  },
  logComment: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centeredText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
});
