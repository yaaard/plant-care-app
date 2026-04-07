import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { StatCard } from '@/components/StatCard';
import { getCareTypeLabel } from '@/constants/careTypes';
import { getHealthTagLabel } from '@/constants/healthTags';
import { getStatsSnapshot, type StatsSnapshot } from '@/lib/stats';
import { getErrorMessage } from '@/lib/validators';

export default function StatsScreen() {
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);

    try {
      const snapshot = await getStatsSnapshot();
      setStats(snapshot);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось загрузить статистику.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Собираем локальную статистику...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <EmptyState
            description={errorMessage ?? 'Статистика пока недоступна.'}
            title="Нет данных"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Статистика" />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <StatCard
          subtitle="Все отмеченные действия за последнюю неделю."
          title="Действия за 7 дней"
          value={stats.actionsLast7Days}
        />
        <StatCard
          subtitle="Сколько раз растения были политы за последние 30 дней."
          title="Поливы за 30 дней"
          value={stats.wateringsLast30Days}
        />
        <StatCard
          subtitle={`Low: ${stats.riskCounts.low} • Medium: ${stats.riskCounts.medium} • High: ${stats.riskCounts.high}`}
          title="Распределение по риску"
          value={stats.riskCounts.low + stats.riskCounts.medium + stats.riskCounts.high}
        />
        <StatCard
          subtitle="Количество невыполненных задач с датой раньше сегодняшней."
          title="Просроченные задачи"
          value={stats.overdueTasks}
        />

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Частые симптомы</Text>
          {stats.symptomCounts.length === 0 ? (
            <Text style={styles.blockText}>Симптомы пока не отмечались.</Text>
          ) : (
            stats.symptomCounts.map((item) => (
              <Text key={item.tag} style={styles.blockText}>
                • {getHealthTagLabel(item.tag)}: {item.count}
              </Text>
            ))
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Частые типы ухода</Text>
          {stats.careTypeUsage.length === 0 ? (
            <Text style={styles.blockText}>Пока нет завершённых действий для анализа.</Text>
          ) : (
            stats.careTypeUsage.map((item) => (
              <Text key={item.type} style={styles.blockText}>
                • {getCareTypeLabel(item.type)}: {item.count}
              </Text>
            ))
          )}
        </View>
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
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  block: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  blockTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  blockText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
});
