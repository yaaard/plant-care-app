import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { SectionTitle } from '@/components/SectionTitle';
import { usePlantCatalog } from '@/hooks/usePlantCatalog';
import { syncPlantCatalog } from '@/lib/plant-catalog-repo';
import { getErrorMessage } from '@/lib/validators';
import {
  formatCatalogSummary,
  formatCatalogTemperatureRange,
} from '@/types/plant-catalog';

export default function GuideScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { plants, loading, error, reload } = usePlantCatalog(query);

  const handleSyncCatalog = async () => {
    setSyncing(true);

    try {
      await syncPlantCatalog();
      await reload();
    } catch (error) {
      Alert.alert(
        'Не удалось синхронизировать каталог',
        getErrorMessage(error, 'Попробуйте повторить синхронизацию позже.')
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Справочник растений" />
        <Text style={styles.subtitle}>
          Каталог используется как база типовых знаний для выбора вида, рекомендаций и AI-контекста.
          После синхронизации он доступен и офлайн.
        </Text>

        <SearchBar
          onChangeText={setQuery}
          placeholder="Поиск по русскому или латинскому названию"
          value={query}
        />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#2f6f3e" size="large" />
            <Text style={styles.centeredText}>Загружаем локальный каталог...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <EmptyState
            actionLabel={syncing ? 'Синхронизация...' : 'Попробовать синхронизацию'}
            description={error}
            onActionPress={() => {
              void handleSyncCatalog();
            }}
            title="Не удалось открыть справочник"
          />
        ) : null}

        {!loading && !error && plants.length === 0 ? (
          <EmptyState
            actionLabel={syncing ? 'Синхронизация...' : 'Загрузить каталог'}
            description={
              query.trim()
                ? 'По вашему запросу ничего не найдено.'
                : 'Каталог пока пуст. После синхронизации он появится и будет доступен офлайн.'
            }
            onActionPress={() => {
              if (!query.trim()) {
                void handleSyncCatalog();
              } else {
                setQuery('');
              }
            }}
            title={query.trim() ? 'Ничего не найдено' : 'Каталог ещё не загружен'}
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
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <Text style={styles.title}>{item.nameRu}</Text>
                <Text style={styles.latinTitle}>{item.nameLatin}</Text>
                <Text numberOfLines={3} style={styles.description}>
                  {item.description}
                </Text>

                <View style={styles.metaWrap}>
                  <Text style={styles.metaChip}>{item.difficultyLevel}</Text>
                  <Text style={styles.metaChip}>{item.category}</Text>
                </View>

                <Text style={styles.summary}>{formatCatalogSummary(item)}</Text>
                <Text style={styles.summary}>
                  Температура: {formatCatalogTemperatureRange(item)}
                </Text>
              </Pressable>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  centered: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  centeredText: {
    color: '#163020',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  latinTitle: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 10,
  },
  description: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaChip: {
    backgroundColor: '#edf7ef',
    borderRadius: 999,
    color: '#2f6f3e',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summary: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.92,
  },
});
