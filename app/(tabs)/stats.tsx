import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { MetricTile } from '@/components/MetricTile';
import { ScreenHero } from '@/components/ScreenHero';
import { SectionTitle } from '@/components/SectionTitle';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
import { getCareTypeLabel } from '@/constants/careTypes';
import { getHealthTagLabel } from '@/constants/healthTags';
import { getStatsSnapshot, type StatsSnapshot } from '@/lib/stats';
import { getErrorMessage } from '@/lib/validators';

export default function StatsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
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

  const totalRiskCount = useMemo(() => {
    if (!stats) {
      return 0;
    }

    return stats.riskCounts.low + stats.riskCounts.medium + stats.riskCounts.high;
  }, [stats]);

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          <Text style={styles.centeredText}>Собираем статистику...</Text>
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
        <ScreenHero
          description="Сводка помогает быстро понять, как чувствует себя ваша коллекция и какие ритуалы ухода повторяются чаще всего."
          eyebrow="Care Insights"
          sideContent={
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{totalRiskCount}</Text>
              <Text style={styles.heroBadgeLabel}>оценок</Text>
            </View>
          }
          title="Статистика ухода"
        >
          <View style={styles.metricsGrid}>
            <MetricTile label="действий за 7 дней" tone="primary" value={stats.actionsLast7Days} />
            <MetricTile label="поливов за 30 дней" value={stats.wateringsLast30Days} />
          </View>
          <View style={styles.metricsGrid}>
            <MetricTile label="просроченных задач" tone="accent" value={stats.overdueTasks} />
            <MetricTile label="растений в риске" value={stats.riskCounts.medium + stats.riskCounts.high} />
          </View>
        </ScreenHero>

        {errorMessage ? (
          <SurfaceCard tone="accent" style={styles.alertCard}>
            <Text style={styles.alertText}>{errorMessage}</Text>
          </SurfaceCard>
        ) : null}

        <View style={[styles.sectionRow, !isWide && styles.sectionRowStack]}>
          <SurfaceCard style={styles.sectionColumn}>
            <SectionTitle title="Распределение риска" />
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Низкий риск</Text>
              <Text style={styles.listValue}>{stats.riskCounts.low}</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Средний риск</Text>
              <Text style={styles.listValue}>{stats.riskCounts.medium}</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Высокий риск</Text>
              <Text style={styles.listValue}>{stats.riskCounts.high}</Text>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionColumn} tone="soft">
            <SectionTitle title="Частые симптомы" />
            {stats.symptomCounts.length === 0 ? (
              <Text style={styles.emptyText}>Симптомы пока не отмечались.</Text>
            ) : (
              stats.symptomCounts.map((item) => (
                <View key={item.tag} style={styles.listItem}>
                  <Text style={styles.listLabel}>{getHealthTagLabel(item.tag)}</Text>
                  <Text style={styles.listValue}>{item.count}</Text>
                </View>
              ))
            )}
          </SurfaceCard>
        </View>

        <SurfaceCard>
          <SectionTitle title="Частые типы ухода" />
          {stats.careTypeUsage.length === 0 ? (
            <Text style={styles.emptyText}>Пока нет завершённых действий для анализа.</Text>
          ) : (
            stats.careTypeUsage.map((item) => (
              <View key={item.type} style={styles.careUsageRow}>
                <View style={styles.careUsageBarTrack}>
                  <View
                    style={[
                      styles.careUsageBarFill,
                      {
                        width: `${Math.max(
                          18,
                          Math.min(
                            100,
                            Math.round((item.count / Math.max(stats.careTypeUsage[0]?.count ?? 1, 1)) * 100)
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.careUsageMeta}>
                  <Text style={styles.careUsageLabel}>{getCareTypeLabel(item.type)}</Text>
                  <Text style={styles.careUsageValue}>{item.count}</Text>
                </View>
              </View>
            ))
          )}
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
  heroBadge: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: 22,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heroBadgeValue: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  heroBadgeLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  alertCard: {
    marginBottom: AppTheme.spacing.section,
  },
  alertText: {
    color: AppTheme.colors.accent,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: AppTheme.spacing.section,
    marginBottom: AppTheme.spacing.section,
  },
  sectionRowStack: {
    flexDirection: 'column',
  },
  sectionColumn: {
    flex: 1,
  },
  listItem: {
    alignItems: 'center',
    borderBottomColor: AppTheme.colors.stroke,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  listLabel: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 15,
    marginRight: 12,
  },
  listValue: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  careUsageRow: {
    marginTop: 12,
  },
  careUsageBarTrack: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  careUsageBarFill: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.pill,
    height: '100%',
  },
  careUsageMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  careUsageLabel: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  careUsageValue: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
});
