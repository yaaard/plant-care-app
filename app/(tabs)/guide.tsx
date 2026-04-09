import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { MetricTile } from '@/components/MetricTile';
import { ScreenHero } from '@/components/ScreenHero';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
import { usePlantCatalog } from '@/hooks/usePlantCatalog';
import { syncPlantCatalog } from '@/lib/plant-catalog-repo';
import { getErrorMessage } from '@/lib/validators';
import { formatCatalogTemperatureRange } from '@/types/plant-catalog';

export default function GuideScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { plants, loading, error, reload } = usePlantCatalog(query);

  const petSafeCount = plants.filter((plant) => plant.petSafe).length;
  const hardCareCount = plants.filter((plant) => plant.difficultyLevel === 'сложный').length;

  const handleSyncCatalog = async () => {
    setSyncing(true);

    try {
      await syncPlantCatalog();
      await reload();
    } catch (syncError) {
      Alert.alert(
        'Не удалось синхронизировать каталог',
        getErrorMessage(syncError, 'Попробуйте повторить синхронизацию позже.')
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHero
          eyebrow="Plant Library"
          sideContent={
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{plants.length}</Text>
              <Text style={styles.heroBadgeLabel}>видов</Text>
            </View>
          }
          title="Справочник растений"
        >
          <View style={styles.metricsRow}>
            <MetricTile label="безопасны для животных" tone="primary" value={petSafeCount} />
            <MetricTile label="сложные в уходе" tone="accent" value={hardCareCount} />
          </View>
        </ScreenHero>

        <SurfaceCard style={styles.explorerCard}>
          <View style={styles.explorerTop}>
            <Text style={styles.sectionTitle}>Каталог типового ухода</Text>

            <Button
              icon={<Ionicons color={AppTheme.colors.white} name="sync-outline" size={18} />}
              label={syncing ? 'Синхронизация...' : 'Обновить'}
              onPress={() => {
                void handleSyncCatalog();
              }}
            />
          </View>

          <SearchBar
            onChangeText={setQuery}
            placeholder="Поиск по русскому или латинскому названию"
            value={query}
          />

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={AppTheme.colors.primary} size="large" />
              <Text style={styles.centeredText}>Загружаем каталог растений...</Text>
            </View>
          ) : null}

          {!loading && error ? (
            <EmptyState
              actionLabel={syncing ? 'Синхронизация...' : 'Попробовать снова'}
              description={error}
              onActionPress={() => {
                void handleSyncCatalog();
              }}
              title="Не удалось открыть каталог"
            />
          ) : null}

          {!loading && !error && plants.length === 0 ? (
            <EmptyState
              actionLabel={query.trim() ? 'Сбросить поиск' : 'Загрузить каталог'}
              description={
                query.trim()
                  ? 'По вашему запросу ничего не найдено.'
                  : 'Каталог пока пуст.'
              }
              onActionPress={() => {
                if (query.trim()) {
                  setQuery('');
                  return;
                }

                void handleSyncCatalog();
              }}
              title={query.trim() ? 'Ничего не найдено' : 'Каталог еще не загружен'}
            />
          ) : null}

          {!loading && !error
            ? plants.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: '/catalog/[id]',
                      params: { id: item.id },
                    } as unknown as Href)
                  }
                  style={({ pressed }) => [styles.catalogCard, pressed && styles.pressed]}
                >
                  <View style={styles.catalogHeader}>
                    <View style={styles.catalogTitleWrap}>
                      <Text style={styles.catalogTitle}>{item.nameRu}</Text>
                      <Text style={styles.catalogLatin}>{item.nameLatin}</Text>
                    </View>

                    <View style={styles.catalogDifficultyBadge}>
                      <Text style={styles.catalogDifficultyText}>{item.difficultyLevel}</Text>
                    </View>
                  </View>

                  <View style={styles.catalogMetaRow}>
                    <Text style={styles.catalogMeta}>{item.category}</Text>
                    <Text style={styles.catalogMeta}>{formatCatalogTemperatureRange(item)}</Text>
                    <Text style={styles.catalogMeta}>{item.lightLevel}</Text>
                  </View>
                </Pressable>
              ))
            : null}
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  content: {
    padding: AppTheme.spacing.page,
    paddingBottom: AppTheme.spacing.xxxl,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: 24,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heroBadgeValue: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroBadgeLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  explorerCard: {
    marginBottom: 12,
  },
  explorerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
    justifyContent: 'space-between',
    marginBottom: AppTheme.spacing.md,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  centered: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  centeredText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  catalogCard: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 12,
    padding: AppTheme.spacing.md,
  },
  catalogHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catalogTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  catalogTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  catalogLatin: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  catalogDifficultyBadge: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  catalogDifficultyText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  catalogMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  catalogMeta: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderRadius: AppTheme.radius.pill,
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.95,
  },
});
