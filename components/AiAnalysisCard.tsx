import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';
import { formatAiOverallCondition, formatAiUrgency, formatDateTime } from '@/lib/formatters';
import type { PlantAiAnalysis } from '@/types/ai-analysis';

type Props = {
  analysis: PlantAiAnalysis;
  defaultExpanded?: boolean;
  showHeaderLabel?: boolean;
};

function renderList(items: string[]) {
  if (items.length === 0) {
    return <Text style={styles.bodyText}>Нет дополнительных пунктов.</Text>;
  }

  return items.map((item) => (
    <Text key={item} style={styles.bodyText}>
      - {item}
    </Text>
  ));
}

export function AiAnalysisCard({
  analysis,
  defaultExpanded = false,
  showHeaderLabel = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const urgencyStyle = useMemo(() => {
    if (analysis.urgency === 'high') {
      return styles.highTone;
    }

    if (analysis.urgency === 'medium') {
      return styles.mediumTone;
    }

    return styles.lowTone;
  }, [analysis.urgency]);

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        {showHeaderLabel ? <Text style={styles.headerLabel}>Последний снимок</Text> : <View />}
        <Text style={styles.dateText}>{formatDateTime(analysis.createdAt)}</Text>
      </View>

      <Text style={styles.summaryText}>{analysis.summary}</Text>

      <View style={styles.badges}>
        <View style={[styles.badge, styles.conditionBadge]}>
          <Text style={styles.conditionBadgeText}>
            {formatAiOverallCondition(analysis.overallCondition)}
          </Text>
        </View>
        <View style={[styles.badge, urgencyStyle]}>
          <Text style={styles.urgencyBadgeText}>
            Срочность: {formatAiUrgency(analysis.urgency)}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.toggleButton, pressed && styles.pressed]}
      >
        <Text style={styles.toggleButtonText}>
          {expanded ? 'Скрыть детали' : 'Показать детали'}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Замеченные признаки</Text>
            {renderList(analysis.observedSigns)}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Возможные причины</Text>
            {renderList(analysis.possibleCauses)}
          </View>

          <View style={styles.adviceGrid}>
            <View style={[styles.adviceCard, styles.adviceCardPrimary]}>
              <Text style={styles.adviceLabel}>Полив</Text>
              <Text style={styles.adviceText}>{analysis.wateringAdvice}</Text>
            </View>
            <View style={styles.adviceCard}>
              <Text style={styles.adviceLabel}>Освещение</Text>
              <Text style={styles.adviceText}>{analysis.lightAdvice}</Text>
            </View>
            <View style={styles.adviceCard}>
              <Text style={styles.adviceLabel}>Влажность</Text>
              <Text style={styles.adviceText}>{analysis.humidityAdvice}</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Рекомендуемые действия</Text>
            {renderList(analysis.recommendedActions)}
          </View>

          <View style={styles.footnoteCard}>
            <Text style={styles.footnoteLabel}>Важно помнить</Text>
            <Text style={styles.footnote}>{analysis.confidenceNote}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xxl,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 18,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLabel: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dateText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  summaryText: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 27,
    marginTop: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  conditionBadge: {
    backgroundColor: AppTheme.colors.primarySoft,
  },
  conditionBadgeText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  lowTone: {
    backgroundColor: AppTheme.colors.successSoft,
  },
  mediumTone: {
    backgroundColor: AppTheme.colors.warningSoft,
  },
  highTone: {
    backgroundColor: AppTheme.colors.dangerSoft,
  },
  urgencyBadgeText: {
    color: AppTheme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.md,
    marginTop: 16,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  toggleButtonText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  details: {
    gap: 12,
    marginTop: 16,
  },
  panel: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.lg,
    padding: 14,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  bodyText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  adviceGrid: {
    gap: 10,
  },
  adviceCard: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.lg,
    padding: 14,
  },
  adviceCardPrimary: {
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  adviceLabel: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  adviceText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  footnoteCard: {
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.lg,
    padding: 14,
  },
  footnoteLabel: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  footnote: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.9,
  },
});
