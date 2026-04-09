import { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { FilterChips, type FilterChipOption } from '@/components/FilterChips';
import { PlantCard } from '@/components/PlantCard';
import { SearchBar } from '@/components/SearchBar';
import { AppTheme } from '@/constants/theme';
import { usePlants } from '@/hooks/usePlants';
import { parseConditionTags } from '@/types/plant';

type PlantFilterKey = 'all' | 'attention' | 'high_risk' | 'overdue' | 'healthy';

const FILTER_OPTIONS: FilterChipOption<PlantFilterKey>[] = [
  { key: 'all', label: 'Все' },
  { key: 'attention', label: 'Требуют внимания' },
  { key: 'high_risk', label: 'Высокий риск' },
  { key: 'overdue', label: 'Просроченные' },
  { key: 'healthy', label: 'Стабильные' },
];

export default function PlantsScreen() {
  const router = useRouter();
  const { plants, loading, error, reload } = usePlants();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKey, setFilterKey] = useState<PlantFilterKey>('all');
  const deferredQuery = useDeferredValue(searchQuery);

  const visiblePlants = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return plants.filter((plant) => {
      const matchesQuery =
        !normalizedQuery ||
        [plant.name, plant.species].some((value) => value.toLowerCase().includes(normalizedQuery));

      if (!matchesQuery) {
        return false;
      }

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
    });
  }, [deferredQuery, filterKey, plants]);

  const attentionCount = plants.filter(
    (plant) => plant.riskLevel !== 'low' || plant.overdueTaskCount > 0
  ).length;

  if (loading && plants.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          <Text style={styles.centeredText}>Загружаем вашу коллекцию растений...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={visiblePlants}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          plants.length === 0 ? (
            <EmptyState
              actionLabel="Добавить растение"
              description="Создайте первую карточку, чтобы хранить уход, задачи и историю в одном месте."
              onActionPress={() => router.push('/plant/add' as Href)}
              title="Пока нет растений"
            />
          ) : (
            <EmptyState
              description="Попробуйте изменить поиск или фильтр."
              title="Ничего не найдено"
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.greeting}>Моя коллекция</Text>
                <Text style={styles.title}>Растения дома</Text>
              </View>

              <View style={styles.topActions}>
                <Pressable
                  onPress={() => router.push('/(tabs)/history' as Href)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Ionicons color={AppTheme.colors.primary} name="time-outline" size={20} />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/plant/add' as Href)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Ionicons color={AppTheme.colors.primary} name="add-outline" size={22} />
                </Pressable>
              </View>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchWrap}>
                <SearchBar
                  onChangeText={setSearchQuery}
                  placeholder="Найти растение..."
                  value={searchQuery}
                />
              </View>

              <Pressable
                onPress={() => router.push('/(tabs)/assistant' as Href)}
                style={({ pressed }) => [styles.primaryRoundButton, pressed && styles.pressed]}
              >
                <Ionicons color={AppTheme.colors.white} name="sparkles-outline" size={22} />
              </Pressable>
            </View>

            <FilterChips
              label="Фильтр"
              onSelect={setFilterKey}
              options={FILTER_OPTIONS}
              selectedKey={filterKey}
            />

            <View style={styles.collectionRow}>
              <Text style={styles.collectionTitle}>Моя коллекция</Text>
              <Text style={styles.collectionCount}>{plants.length} шт</Text>
            </View>

            {attentionCount > 0 ? (
              <View style={styles.inlineNotice}>
                <Ionicons color={AppTheme.colors.accent} name="alert-circle-outline" size={16} />
                <Text style={styles.inlineNoticeText}>
                  {attentionCount} растений требуют внимания
                </Text>
              </View>
            ) : null}

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
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 12,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    ...AppTheme.shadow.card,
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 20,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchWrap: {
    flex: 1,
  },
  primaryRoundButton: {
    ...AppTheme.shadow.floating,
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 24,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  collectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  collectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  collectionCount: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  inlineNotice: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.accentSoft,
    borderColor: '#ffe6c2',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineNoticeText: {
    color: AppTheme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: AppTheme.colors.danger,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
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
  pressed: {
    opacity: 0.92,
  },
});
