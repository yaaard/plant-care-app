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
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { MetricTile } from '@/components/MetricTile';
import { SectionTitle } from '@/components/SectionTitle';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
import {
  getCatalogPlantById,
  getCatalogSymptomsByPlantId,
} from '@/lib/plant-catalog-repo';
import { getErrorMessage } from '@/lib/validators';
import {
  formatCatalogTemperatureRange,
  formatCatalogWateringRange,
  type PlantCatalogPlant,
  type PlantCatalogSymptom,
} from '@/types/plant-catalog';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatBooleanLabel(value: boolean, positiveLabel: string, negativeLabel: string) {
  return value ? positiveLabel : negativeLabel;
}

type FeatureRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function FeatureRow({ icon, label, value }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Ionicons color={AppTheme.colors.primaryStrong} name={icon} size={18} />
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function CatalogPlantDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const catalogPlantId = normalizeParam(params.id);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [plant, setPlant] = useState<PlantCatalogPlant | null>(null);
  const [symptoms, setSymptoms] = useState<PlantCatalogSymptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCatalogEntry = useCallback(async () => {
    if (!catalogPlantId) {
      setErrorMessage('Не удалось определить запись справочника.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [nextPlant, nextSymptoms] = await Promise.all([
        getCatalogPlantById(catalogPlantId),
        getCatalogSymptomsByPlantId(catalogPlantId),
      ]);

      setPlant(nextPlant);
      setSymptoms(nextSymptoms);
      setErrorMessage(nextPlant ? null : 'Запись справочника не найдена.');
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Не удалось загрузить карточку растения из справочника.')
      );
    } finally {
      setLoading(false);
    }
  }, [catalogPlantId]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalogEntry();
    }, [loadCatalogEntry])
  );

  const heroTags = useMemo(() => {
    if (!plant) {
      return [];
    }

    return [
      plant.category,
      plant.difficultyLevel,
      plant.petSafe ? 'дружелюбно к питомцам' : 'осторожно с питомцами',
    ];
  }, [plant]);

  if (loading && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          <Text style={styles.centeredText}>Загружаем карточку из справочника...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Справочник' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="Назад к справочнику"
            description={errorMessage ?? 'Запись справочника недоступна.'}
            onActionPress={() => router.replace('/(tabs)/guide' as Href)}
            title="Запись не найдена"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: plant.nameRu }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowSecondary} />

          <View style={[styles.heroHeader, !isWide && styles.heroHeaderStack]}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>База типового ухода</Text>
              <Text style={styles.heroTitle}>{plant.nameRu}</Text>
              <Text style={styles.heroLatin}>{plant.nameLatin}</Text>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons color={AppTheme.colors.primaryStrong} name="leaf-outline" size={20} />
              <Text style={styles.heroBadgeText}>Каталог</Text>
            </View>
          </View>

          <View style={styles.tagWrap}>
            {heroTags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.metricRow}>
            <MetricTile label="полив" tone="primary" value={formatCatalogWateringRange(plant)} />
            <MetricTile label="температура" value={formatCatalogTemperatureRange(plant)} />
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="влажность" value={plant.humidityLevel} />
            <MetricTile label="свет" tone="accent" value={plant.lightLevel} />
          </View>
        </SurfaceCard>

        <View style={[styles.dualColumn, !isWide && styles.dualColumnStack]}>
          <SurfaceCard style={styles.mainColumn}>
            <SectionTitle title="Базовый профиль" />
            <FeatureRow icon="water-outline" label="Режим полива" value={formatCatalogWateringRange(plant)} />
            <FeatureRow icon="sunny-outline" label="Освещение" value={plant.lightLevel} />
            <FeatureRow icon="water-outline" label="Влажность" value={plant.humidityLevel} />
            <FeatureRow
              icon="thermometer-outline"
              label="Температура"
              value={formatCatalogTemperatureRange(plant)}
            />
            <FeatureRow
              icon="flower-outline"
              label="Грунт"
              value={plant.soilType || 'Нет данных'}
            />
            <FeatureRow
              icon="nutrition-outline"
              label="Подкормка"
              value={plant.fertilizingInfo || 'Нет данных'}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.sideColumn} tone="soft">
            <SectionTitle title="Особенности" />
            <FeatureRow
              icon="sparkles-outline"
              label="Опрыскивание"
              value={formatBooleanLabel(
                plant.sprayingNeeded,
                plant.sprayingIntervalDays
                  ? `Да, примерно раз в ${plant.sprayingIntervalDays} дн.`
                  : 'Да, обычно полезно',
                'Обычно не требуется'
              )}
            />
            <FeatureRow
              icon="paw-outline"
              label="Питомцы"
              value={formatBooleanLabel(
                plant.petSafe,
                'Обычно безопасно',
                'Лучше держать подальше'
              )}
            />
            <FeatureRow
              icon="time-outline"
              label="Осмотр"
              value={`Примерно раз в ${plant.inspectionIntervalDays} дн.`}
            />
            <View style={styles.sideCallout}>
              <Text style={styles.sideCalloutLabel}>Сложность ухода</Text>
              <Text style={styles.sideCalloutValue}>{plant.difficultyLevel}</Text>
            </View>
          </SurfaceCard>
        </View>

        <View style={[styles.dualColumn, !isWide && styles.dualColumnStack]}>
          <SurfaceCard style={styles.mainColumn}>
            <SectionTitle title="Как ухаживать" />
            <Text style={styles.bodyText}>{plant.careTips || 'Пока нет дополнительных советов.'}</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.sideColumn} tone="muted">
            <SectionTitle title="На что обратить внимание" />
            <Text style={styles.bodyText}>
              {plant.riskNotes || 'Пока нет дополнительных заметок о типичных рисках.'}
            </Text>
          </SurfaceCard>
        </View>

        <SurfaceCard>
          <SectionTitle title="Типовые симптомы и действия" />
          {symptoms.length === 0 ? (
            <EmptyState
              description="Для этой записи пока не добавлены типовые симптомы."
              title="Симптомы пока не заполнены"
            />
          ) : (
            symptoms.map((symptom) => (
              <View key={symptom.id} style={styles.symptomCard}>
                <View style={styles.symptomHeader}>
                  <Text style={styles.symptomTitle}>{symptom.symptomNameRu}</Text>
                  <View style={styles.symptomCodeChip}>
                    <Text style={styles.symptomCodeText}>{symptom.symptomCode}</Text>
                  </View>
                </View>
                <Text style={styles.symptomLabel}>Возможная причина</Text>
                <Text style={styles.bodyText}>{symptom.possibleCause}</Text>
                <Text style={styles.symptomLabel}>Что обычно помогает</Text>
                <Text style={styles.bodyText}>{symptom.recommendedAction}</Text>
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
  heroCard: {
    marginBottom: AppTheme.spacing.section,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlowPrimary: {
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
    borderRadius: 999,
    height: 180,
    position: 'absolute',
    right: -48,
    top: -52,
    width: 180,
  },
  heroGlowSecondary: {
    backgroundColor: 'rgba(42, 122, 107, 0.08)',
    borderRadius: 999,
    bottom: -70,
    height: 170,
    left: -30,
    position: 'absolute',
    width: 170,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  heroHeaderStack: {
    flexDirection: 'column',
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: AppTheme.colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 36,
  },
  heroLatin: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    marginTop: 6,
  },
  heroBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: 22,
    gap: 6,
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heroBadgeText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    color: AppTheme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dualColumn: {
    flexDirection: 'row',
    gap: AppTheme.spacing.section,
    marginBottom: AppTheme.spacing.section,
  },
  dualColumnStack: {
    flexDirection: 'column',
  },
  mainColumn: {
    flex: 1.15,
  },
  sideColumn: {
    flex: 0.85,
  },
  featureRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  featureIconWrap: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  featureCopy: {
    flex: 1,
  },
  featureLabel: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  featureValue: {
    color: AppTheme.colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  sideCallout: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  sideCalloutLabel: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sideCalloutValue: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  bodyText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  symptomCard: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.xl,
    marginTop: 12,
    padding: 16,
  },
  symptomHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  symptomTitle: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    marginRight: 12,
  },
  symptomCodeChip: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  symptomCodeText: {
    color: AppTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  symptomLabel: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
});
