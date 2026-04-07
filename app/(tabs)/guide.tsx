import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { PLANT_GUIDE } from '@/constants/plantGuide';

export default function GuideScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(PLANT_GUIDE[0]?.id ?? null);

  if (PLANT_GUIDE.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <EmptyState
            description="Локальная база знаний пока не заполнена."
            title="Справочник пуст"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Справочник растений" />
        <Text style={styles.subtitle}>
          Эти ориентиры используются и в модуле рекомендаций: по ним приложение сравнивает
          текущие условия, интервалы ухода и признаки состояния.
        </Text>

        {PLANT_GUIDE.map((item) => {
          const expanded = expandedId === item.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => setExpandedId(expanded ? null : item.id)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleBlock}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.meta}>
                    Полив примерно раз в {item.recommendedWateringIntervalDays} дн.
                  </Text>
                </View>
                <Text style={styles.expandLabel}>{expanded ? 'Скрыть' : 'Открыть'}</Text>
              </View>

              {expanded ? (
                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Освещение</Text>
                    <Text style={styles.detailValue}>{item.lightLevel}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Влажность</Text>
                    <Text style={styles.detailValue}>{item.humidityLevel}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Температура</Text>
                    <Text style={styles.detailValue}>{item.temperatureRange}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Осмотр</Text>
                    <Text style={styles.detailValue}>примерно раз в {item.inspectionIntervalDays} дн.</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Опрыскивание</Text>
                    <Text style={styles.detailValue}>
                      {item.sprayingIntervalDays
                        ? `примерно раз в ${item.sprayingIntervalDays} дн.`
                        : 'обычно не требуется'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Подкормка</Text>
                    <Text style={styles.detailValue}>
                      примерно раз в {item.fertilizingIntervalDays} дн.
                    </Text>
                  </View>

                  <Text style={styles.sectionLabel}>Советы по уходу</Text>
                  <Text style={styles.bodyText}>{item.careTips}</Text>

                  <Text style={styles.sectionLabel}>Типичные ошибки</Text>
                  <Text style={styles.bodyText}>{item.riskNotes}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
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
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#163020',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: '#667085',
    fontSize: 13,
  },
  expandLabel: {
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '700',
  },
  details: {
    marginTop: 14,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    color: '#667085',
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    color: '#163020',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#163020',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  bodyText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.92,
  },
});
