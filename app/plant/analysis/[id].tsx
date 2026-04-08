import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { AiAnalysisCard } from '@/components/AiAnalysisCard';
import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { useAiAnalyses } from '@/hooks/useAiAnalyses';
import { useSync } from '@/hooks/useSync';
import { requestPlantAiAnalysis } from '@/lib/gemini-client';
import { getPlantById } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';
import type { Plant } from '@/types/plant';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  text: string;
} | null;

export default function PlantPhotoAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id);
  const { syncNow, isSyncing } = useSync();
  const { analyses, latestAnalysis, loading: analysesLoading, reload: reloadAnalyses } =
    useAiAnalyses(plantId);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loadingPlant, setLoadingPlant] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadPlant = useCallback(async () => {
    if (!plantId) {
      setPlant(null);
      setFeedback({
        type: 'error',
        text: 'Не удалось определить растение для AI-анализа.',
      });
      setLoadingPlant(false);
      return;
    }

    setLoadingPlant(true);

    try {
      const nextPlant = await getPlantById(plantId);
      setPlant(nextPlant);

      if (!nextPlant) {
        setFeedback({
          type: 'error',
          text: 'Растение не найдено или уже было удалено.',
        });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось загрузить растение для AI-анализа.'),
      });
    } finally {
      setLoadingPlant(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void loadPlant();
    }, [loadPlant])
  );

  const openEditPhoto = () => {
    if (!plantId) {
      return;
    }

    router.push({
      pathname: '/plant/edit/[id]',
      params: { id: plantId },
    } as unknown as Href);
  };

  const confirmPhotoRequirement = () => {
    Alert.alert(
      'Сначала добавьте фото растения',
      'Без фотографии AI-анализ не сможет оценить состояние растения. Откройте редактирование и прикрепите фото из галереи.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Открыть редактирование',
          onPress: openEditPhoto,
        },
      ]
    );
  };

  const handleRunAnalysis = async () => {
    if (!plantId || !plant) {
      return;
    }

    if (!plant.photoUri && !plant.photoPath) {
      confirmPhotoRequirement();
      return;
    }

    if (isSyncing) {
      setFeedback({
        type: 'info',
        text: 'Сначала дождитесь завершения текущей синхронизации, затем запустите AI-анализ ещё раз.',
      });
      return;
    }

    setRunningAnalysis(true);
    setFeedback({
      type: 'info',
      text: 'Подготавливаем фото и отправляем запрос на AI-анализ...',
    });

    try {
      if (
        plant.photoUri?.startsWith('file') ||
        plant.syncStatus !== 'synced' ||
        !plant.photoPath
      ) {
        const syncCompleted = await syncNow();

        if (!syncCompleted) {
          throw new Error(
            'Не удалось подготовить фото для анализа. Проверьте интернет и повторите попытку.'
          );
        }

        await loadPlant();
      }

      const refreshedPlant = await getPlantById(plantId);

      if (!refreshedPlant?.photoPath) {
        throw new Error(
          'Фото растения ещё не готово для облачного анализа. Сначала завершите синхронизацию фотографии.'
        );
      }

      setFeedback({
        type: 'info',
        text: 'Идет анализ фото. Это может занять до минуты.',
      });

      await requestPlantAiAnalysis(plantId);
      await reloadAnalyses();
      await loadPlant();

      setFeedback({
        type: 'success',
        text: 'AI-анализ успешно сохранён и добавлен в историю растения.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось выполнить AI-анализ растения.'),
      });
    } finally {
      setRunningAnalysis(false);
    }
  };

  if (loadingPlant && !plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2f6f3e" size="large" />
          <Text style={styles.centeredText}>Готовим экран AI-анализа...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'AI-анализ' }} />
        <View style={styles.content}>
          <EmptyState
            actionLabel="Вернуться к растениям"
            description={feedback?.text ?? 'Растение не найдено или уже было удалено.'}
            onActionPress={() => router.replace('/(tabs)/plants' as Href)}
            title="AI-анализ недоступен"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `AI-анализ: ${plant.name}` }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {plant.photoUri ? (
          <Image source={{ uri: plant.photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderTitle}>Фото пока не добавлено</Text>
            <Text style={styles.photoPlaceholderSubtitle}>
              Для AI-анализа нужен снимок растения. Можно прикрепить его на экране редактирования.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <SectionTitle title="AI-анализ фото" />
          <Text style={styles.bodyText}>
            AI анализирует фото растения, формирует аккуратный вероятностный вывод и сохраняет его
            в ваш аккаунт. Результат не заменяет очный осмотр растения.
          </Text>

          <Pressable
            disabled={runningAnalysis || loadingPlant || isSyncing}
            onPress={() => {
              void handleRunAnalysis();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || runningAnalysis || loadingPlant || isSyncing) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {runningAnalysis
                ? 'Идет анализ...'
                : isSyncing
                  ? 'Синхронизируем фото...'
                  : 'Проанализировать растение'}
            </Text>
          </Pressable>

          <View style={styles.buttonSpacer} />

          <Pressable
            onPress={openEditPhoto}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Обновить фото</Text>
          </Pressable>
        </View>

        {feedback ? (
          <View
            style={[
              styles.messageBox,
              feedback.type === 'success'
                ? styles.successBox
                : feedback.type === 'error'
                  ? styles.errorBox
                  : styles.infoBox,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                feedback.type === 'success'
                  ? styles.successText
                  : feedback.type === 'error'
                    ? styles.errorText
                    : styles.infoText,
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        ) : null}

        <SectionTitle title="Последний анализ" />
        {latestAnalysis ? (
          <AiAnalysisCard analysis={latestAnalysis} defaultExpanded />
        ) : analysesLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#2f6f3e" />
            <Text style={styles.loadingText}>Загружаем историю анализов...</Text>
          </View>
        ) : (
          <EmptyState
            description="После первого успешного запуска здесь появится последний AI-анализ с полными рекомендациями."
            title="Анализов пока нет"
          />
        )}

        <SectionTitle title="История анализов" />
        {analyses.length > 1 ? (
          analyses.slice(1).map((analysis) => (
            <AiAnalysisCard key={analysis.id} analysis={analysis} />
          ))
        ) : (
          <EmptyState
            description="Когда вы запустите анализ повторно, предыдущие результаты будут храниться здесь и останутся доступны локально."
            title="История пока пуста"
          />
        )}
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
  photo: {
    borderRadius: 20,
    height: 240,
    marginBottom: 16,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#edf3ed',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    height: 240,
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  photoPlaceholderTitle: {
    color: '#163020',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  photoPlaceholderSubtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  bodyText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#edf7ef',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#2f6f3e',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonSpacer: {
    height: 10,
  },
  messageBox: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 14,
  },
  successBox: {
    backgroundColor: '#edf7ef',
  },
  errorBox: {
    backgroundColor: '#fff1e8',
  },
  infoBox: {
    backgroundColor: '#eef6ff',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: '#2f6f3e',
  },
  errorText: {
    color: '#9a3412',
  },
  infoText: {
    color: '#1d4ed8',
  },
  pressed: {
    opacity: 0.9,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  loadingText: {
    color: '#163020',
    fontSize: 14,
  },
});
