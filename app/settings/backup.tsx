import { Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
import {
  exportAppBackupAsync,
  pickBackupFileAsync,
  resetAllDataAsync,
  restoreBackupAsync,
  shareBackupFileAsync,
} from '@/lib/backup';
import { bindAnonymousDataToUser } from '@/lib/sync';
import { getErrorMessage } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';

type FeedbackState = {
  type: 'success' | 'error';
  text: string;
} | null;

export default function BackupSettingsScreen() {
  const { user } = useAuth();
  const { syncNow } = useSync();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const handleExport = async () => {
    setBusy(true);

    try {
      const result = await exportAppBackupAsync();
      const shared = await shareBackupFileAsync(result.fileUri);

      setFeedback({
        type: 'success',
        text: shared
          ? `Резервная копия "${result.fileName}" создана и открыта для отправки.`
          : `Резервная копия "${result.fileName}" создана и сохранена на устройстве.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось экспортировать данные в JSON.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmRestore = async () => {
    setBusy(true);

    try {
      const parsed = await pickBackupFileAsync();

      if (!parsed) {
        setBusy(false);
        return;
      }

      setBusy(false);

      Alert.alert(
        'Импортировать резервную копию?',
        `Файл "${parsed.fileName}" полностью заменит текущие данные приложения на этом устройстве.`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Импортировать',
            style: 'destructive',
            onPress: () => {
              setBusy(true);

              void (async () => {
                try {
                  await restoreBackupAsync(parsed.backup);

                  if (user) {
                    await bindAnonymousDataToUser(user.id);
                    await syncNow();
                  }

                  setFeedback({
                    type: 'success',
                    text: 'Резервная копия успешно импортирована.',
                  });
                } catch (error) {
                  setFeedback({
                    type: 'error',
                    text: getErrorMessage(error, 'Не удалось импортировать резервную копию.'),
                  });
                } finally {
                  setBusy(false);
                }
              })();
            },
          },
        ]
      );
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось прочитать файл с резервной копией.'),
      });
      setBusy(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Сбросить данные на устройстве?',
      'Будут удалены только данные на этом устройстве. Данные в аккаунте сохранятся.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: () => {
            setBusy(true);

            void (async () => {
              try {
                await resetAllDataAsync();
                setFeedback({
                  type: 'success',
                  text: 'Данные на устройстве удалены.',
                });
              } catch (error) {
                setFeedback({
                  type: 'error',
                  text: getErrorMessage(error, 'Не удалось сбросить данные на устройстве.'),
                });
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="Резервная копия" />

        {feedback ? <InlineBanner text={feedback.text} tone={feedback.type} /> : null}

        <SurfaceCard style={styles.cardGap}>
          <Button
            disabled={busy}
            label={busy ? 'Подготовка...' : 'Экспорт данных'}
            onPress={() => {
              void handleExport();
            }}
            tone="secondary"
          />

          <Button
            disabled={busy}
            label="Импорт данных"
            onPress={() => {
              void confirmRestore();
            }}
            tone="ghost"
          />
        </SurfaceCard>

        <SurfaceCard tone="soft">
          <Button
            disabled={busy}
            label="Сбросить данные на устройстве"
            onPress={confirmReset}
            tone="danger"
          />
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
  cardGap: {
    gap: 10,
    marginBottom: 12,
  },
});
