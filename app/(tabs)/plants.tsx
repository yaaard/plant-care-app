import { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { FilterChips, type FilterChipOption } from '@/components/FilterChips';
import { PlantCard } from '@/components/PlantCard';
import { SearchBar } from '@/components/SearchBar';
import { SectionTitle } from '@/components/SectionTitle';
import { SortSelector } from '@/components/SortSelector';
import { usePlants } from '@/hooks/usePlants';
import { parseConditionTags, type PlantListItem } from '@/types/plant';

type PlantFilterKey = 'all' | 'attention' | 'high_risk' | 'overdue' | 'healthy';
type PlantSortKey = 'name' | 'next_task' | 'risk' | 'updated';

const FILTER_OPTIONS: FilterChipOption<PlantFilterKey>[] = [
  { key: 'all', label: 'Все' },
  { key: 'attention', label: 'Требуют внимания' },
  { key: 'high_risk', label: 'Высокий риск' },
  { key: 'overdue', label: 'Есть просроченные' },
  { key: 'healthy', label: 'Здоровые' },
];

const SORT_OPTIONS: FilterChipOption<PlantSortKey>[] = [
  { key: 'name', label: 'По названию' },
  { key: 'next_task', label: 'По ближайшей задаче' },
  { key: 'risk', label: 'По риску' },
  { key: 'updated', label: 'По обновлению' },
];

function getRiskWeight(riskLevel: PlantListItem['riskLevel']) {
  if (riskLevel === 'high') {
    return 3;
  }

  if (riskLevel === 'medium') {
    return 2;
  }

  return 1;
}

export default function PlantsScreen() {
  const router = useRouter();
  const { plants, loading, error, reload } = usePlants();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKey, setFilterKey] = useState<PlantFilterKey>('all');
  const [sortKey, setSortKey] = useState<PlantSortKey>('name');
  const deferredQuery = useDeferredValue(searchQuery);

  const visiblePlants = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return [...plants]
      .filter((plant) => {
        if (!normalizedQuery) {
          return true;
        }

        return [plant.name, plant.species].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        );
      })
      .filter((plant) => {
        const conditionTags = parseConditionTags(plant.conditionTags);

        switch (filterKey) {
          case 'attention':
            return (
              plant.riskLevel === 'medium' ||
              plant.riskLevel === 'high' ||
              plant.overdueTaskCount > 0
            );
          case 'high_risk':
            return plant.riskLevel === 'high';
          case 'overdue':
            return plant.overdueTaskCount > 0;
          case 'healthy':
            return conditionTags.includes('healthy') || plant.riskLevel === 'low';
          default:
            return true;
        }
      })
      .sort((left, right) => {
        switch (sortKey) {
          case 'next_task':
            return (left.nextTaskDate ?? '9999-12-31').localeCompare(
              right.nextTaskDate ?? '9999-12-31'
            );
          case 'risk':
            return getRiskWeight(right.riskLevel) - getRiskWeight(left.riskLevel);
          case 'updated':
            return right.updatedAt.localeCompare(left.updatedAt);
          case 'name':
          default:
            return left.name.localeCompare(right.name, 'ru-RU');
        }
      });
  }, [deferredQuery, filterKey, plants, sortKey]);

  const hasFiltersApplied = Boolean(deferredQuery.trim()) || filterKey !== 'all';

  if (loading && plants.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Загружаем коллекцию растений...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={visiblePlants}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          plants.length === 0 ? (
            <EmptyState
              actionLabel="Добавить растение"
              description="Создайте первую карточку, чтобы хранить задачи, журнал ухода и рекомендации локально на устройстве."
              onActionPress={() => router.push('/plant/add' as Href)}
              title="Пока нет растений"
            />
          ) : (
            <EmptyState
              description="Попробуйте изменить строку поиска, фильтр или сортировку."
              title={hasFiltersApplied ? 'Ничего не найдено' : 'Список пуст'}
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionTitle title="Мои растения" />
            <Pressable
              onPress={() => router.push('/plant/add' as Href)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Добавить растение</Text>
            </Pressable>

            <SearchBar
              onChangeText={setSearchQuery}
              placeholder="Поиск по названию или виду"
              value={searchQuery}
            />

            <FilterChips
              label="Фильтры"
              onSelect={setFilterKey}
              options={FILTER_OPTIONS}
              selectedKey={filterKey}
            />

            <SortSelector
              onSelect={setSortKey}
              options={SORT_OPTIONS}
              selectedKey={sortKey}
            />

            <Text style={styles.summaryText}>
              Найдено растений: {visiblePlants.length} из {plants.length}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        onRefresh={() => {
          void reload();
        }}
        refreshing={loading}
        renderItem={({ item }) => (
          <PlantCard
            onPress={() =>
              router.push({
                pathname: '/plant/[id]',
                params: { id: item.id },
              } as unknown as Href)
            }
            plant={item}
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
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryText: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.9,
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
