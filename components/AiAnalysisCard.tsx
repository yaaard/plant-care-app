import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
      {showHeaderLabel ? <Text style={styles.headerLabel}>AI-анализ</Text> : null}

      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.summaryText}>{analysis.summary}</Text>
          <Text style={styles.dateText}>{formatDateTime(analysis.createdAt)}</Text>
        </View>

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
          <Text style={styles.sectionTitle}>Замеченные признаки</Text>
          {renderList(analysis.observedSigns)}

          <Text style={styles.sectionTitle}>Возможные причины</Text>
          {renderList(analysis.possibleCauses)}

          <Text style={styles.sectionTitle}>Совет по поливу</Text>
          <Text style={styles.bodyText}>{analysis.wateringAdvice}</Text>

          <Text style={styles.sectionTitle}>Совет по освещению</Text>
          <Text style={styles.bodyText}>{analysis.lightAdvice}</Text>

          <Text style={styles.sectionTitle}>Совет по влажности</Text>
          <Text style={styles.bodyText}>{analysis.humidityAdvice}</Text>

          <Text style={styles.sectionTitle}>Рекомендуемые действия</Text>
          {renderList(analysis.recommendedActions)}

          <Text style={styles.sectionTitle}>Важно</Text>
          <Text style={styles.footnote}>{analysis.confidenceNote}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  headerLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  headerRow: {
    gap: 12,
  },
  headerTextBlock: {
    gap: 8,
  },
  summaryText: {
    color: '#163020',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  dateText: {
    color: '#667085',
    fontSize: 13,
  },
  badges: {
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  conditionBadge: {
    backgroundColor: '#edf7ef',
  },
  conditionBadgeText: {
    color: '#2f6f3e',
    fontSize: 12,
    fontWeight: '700',
  },
  lowTone: {
    backgroundColor: '#ecfdf3',
  },
  mediumTone: {
    backgroundColor: '#fff7e6',
  },
  highTone: {
    backgroundColor: '#fff1e8',
  },
  urgencyBadgeText: {
    color: '#163020',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: '#f4f7f3',
    borderRadius: 12,
    marginTop: 14,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  toggleButtonText: {
    color: '#2f6f3e',
    fontSize: 14,
    fontWeight: '700',
  },
  details: {
    marginTop: 14,
  },
  sectionTitle: {
    color: '#163020',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  bodyText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  footnote: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.9,
  },
});
