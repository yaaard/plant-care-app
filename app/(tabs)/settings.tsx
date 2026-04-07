import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { SectionTitle } from '@/components/SectionTitle';
import { SettingSection } from '@/components/SettingSection';
import {
  exportAppBackupAsync,
  pickBackupFileAsync,
  resetAllDataAsync,
  restoreBackupAsync,
  shareBackupFileAsync,
} from '@/lib/backup';
import { formatDateTime } from '@/lib/formatters';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { getSettings, updateSettings } from '@/lib/settings-repo';
import { bindAnonymousDataToUser } from '@/lib/sync';
import {
  getErrorMessage,
  normalizeSettingsFormValues,
  validateSettings,
} from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';

type FeedbackState = {
  type: 'success' | 'error';
  text: string;
} | null;

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const {
    isSyncing,
    lastSyncAt,
    syncError,
    pendingChangesCount,
    syncNow,
    dismissSyncError,
  } = useSync();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationHour, setNotificationHour] = useState('9');
  const [notificationMinute, setNotificationMinute] = useState('0');
  const [loading, setLoading] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const settings = await getSettings();
      setNotificationsEnabled(Boolean(settings.notificationsEnabled));
      setNotificationHour(String(settings.notificationHour));
      setNotificationMinute(String(settings.notificationMinute));
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось загрузить настройки.'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings])
  );

  const handleSaveNotifications = async () => {
    const errors = validateSettings({
      notificationsEnabled,
      notificationHour: Number(notificationHour),
      notificationMinute: Number(notificationMinute),
    });

    if (errors.length > 0) {
      setFeedback({
        type: 'error',
        text: errors.join('\n'),
      });
      return;
    }

    setSavingNotifications(true);

    try {
      await updateSettings(
        normalizeSettingsFormValues({
          notificationsEnabled,
          notificationHour: Number(notificationHour),
          notificationMinute: Number(notificationMinute),
        })
      );

      const result = await refreshScheduledNotificationsAsync();

      if (result.permissionGranted === false) {
        setFeedback({
          type: 'error',
          text: 'Настройки сохранены, но система не дала доступ к уведомлениям.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: 'Настройки уведомлений сохранены.',
        });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось сохранить настройки уведомлений.'),
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleManualSync = async () => {
    dismissSyncError();
    const success = await syncNow();

    if (success) {
      setFeedback({
        type: 'success',
        text: 'Данные успешно синхронизированы.',
      });
    }
  };

  const handleExport = async () => {
    setBackupBusy(true);

    try {
      const result = await exportAppBackupAsync();
      const shared = await shareBackupFileAsync(result.fileUri);

      setFeedback({
        type: 'success',
        text: shared
          ? `Резервная копия "${result.fileName}" создана и открыта для отправки.`
          : `Резервная копия "${result.fileName}" создана и сохранена локально.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось экспортировать данные в JSON.'),
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const confirmRestore = async () => {
    setBackupBusy(true);

    try {
      const parsed = await pickBackupFileAsync();

      if (!parsed) {
        setBackupBusy(false);
        return;
      }

      setBackupBusy(false);

      Alert.alert(
        'Импортировать резервную копию?',
        `Файл "${parsed.fileName}" полностью заменит текущие локальные данные приложения.`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Импортировать',
            style: 'destructive',
            onPress: () => {
              setBackupBusy(true);

              void (async () => {
                try {
                  await restoreBackupAsync(parsed.backup);

                  if (user) {
                    await bindAnonymousDataToUser(user.id);
                    await syncNow();
                  }

                  await loadSettings();
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
                  setBackupBusy(false);
                }
              })();
            },
          },
        ]
      );
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось прочитать backup-файл.'),
      });
      setBackupBusy(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Сбросить локальные данные?',
      'Будут удалены только данные на этом устройстве. Если аккаунт подключён, облачные данные останутся и могут снова загрузиться после синхронизации.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: () => {
            setBackupBusy(true);

            void (async () => {
              try {
                await resetAllDataAsync();
                await loadSettings();
                setFeedback({
                  type: 'success',
                  text: 'Локальные данные на устройстве удалены.',
                });
              } catch (error) {
                setFeedback({
                  type: 'error',
                  text: getErrorMessage(error, 'Не удалось сбросить локальные данные.'),
                });
              } finally {
                setBackupBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  const confirmSignOut = () => {
    Alert.alert('Выйти из аккаунта?', 'Локальные данные текущего пользователя будут очищены с устройства.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await signOut();
            } catch (error) {
              setFeedback({
                type: 'error',
                text: getErrorMessage(error, 'Не удалось выйти из аккаунта.'),
              });
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Настройки" />

        <SettingSection
          description="Аккаунт нужен для синхронизации растений, истории и фото между устройствами."
          title="Аккаунт"
        >
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? 'Не удалось определить email'}</Text>

          <Text style={styles.label}>Статус</Text>
          <Text style={styles.value}>Вход выполнен</Text>

          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Выйти</Text>
          </Pressable>
        </SettingSection>

        <SettingSection
          description="Синхронизация отправляет локальные изменения в Supabase и подтягивает данные аккаунта обратно в SQLite."
          title="Синхронизация"
        >
          <Text style={styles.label}>Последняя синхронизация</Text>
          <Text style={styles.value}>{formatDateTime(lastSyncAt, 'Ещё не выполнялась')}</Text>

          <Text style={styles.label}>Ожидают отправки</Text>
          <Text style={styles.value}>{pendingChangesCount}</Text>

          {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}

          <Pressable
            disabled={isSyncing}
            onPress={() => {
              void handleManualSync();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSyncing) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSyncing ? 'Синхронизируем...' : 'Синхронизировать сейчас'}
            </Text>
          </Pressable>
        </SettingSection>

        <SettingSection
          description="Одно локальное уведомление на каждую активную задачу по уходу."
          title="Уведомления"
        >
          <View style={styles.switchRow}>
            <View style={styles.switchTextBlock}>
              <Text style={styles.switchTitle}>Локальные напоминания</Text>
              <Text style={styles.switchSubtitle}>
                Если отключить, новые уведомления больше не будут создаваться.
              </Text>
            </View>

            <Switch
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#cdd5cf', true: '#95c39f' }}
              value={notificationsEnabled}
            />
          </View>

          <FormField
            editable={!loading}
            keyboardType="number-pad"
            label="Час уведомления"
            maxLength={2}
            onChangeText={setNotificationHour}
            placeholder="9"
            value={notificationHour}
          />

          <FormField
            editable={!loading}
            keyboardType="number-pad"
            label="Минуты уведомления"
            maxLength={2}
            onChangeText={setNotificationMinute}
            placeholder="0"
            value={notificationMinute}
          />

          <Pressable
            disabled={savingNotifications || loading}
            onPress={() => {
              void handleSaveNotifications();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || savingNotifications || loading) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {savingNotifications ? 'Сохраняем...' : 'Сохранить настройки'}
            </Text>
          </Pressable>
        </SettingSection>

        <SettingSection
          description="Экспорт создаёт один JSON-файл. Импорт заменяет локальную базу и затем может быть синхронизирован в аккаунт."
          title="Резервное копирование"
        >
          <View style={styles.actionColumn}>
            <Pressable
              disabled={backupBusy}
              onPress={() => {
                void handleExport();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || backupBusy) && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {backupBusy ? 'Подготовка...' : 'Экспорт данных'}
              </Text>
            </Pressable>

            <Pressable
              disabled={backupBusy}
              onPress={() => {
                void confirmRestore();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || backupBusy) && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Импорт данных</Text>
            </Pressable>
          </View>
        </SettingSection>

        <SettingSection
          description="Эти действия касаются только локального устройства. Для удаления облачных данных используйте аккаунт и синхронизацию осознанно."
          title="Опасные действия"
          tone="danger"
        >
          <Pressable
            disabled={backupBusy}
            onPress={confirmReset}
            style={({ pressed }) => [
              styles.dangerButton,
              (pressed || backupBusy) && styles.pressed,
            ]}
          >
            <Text style={styles.dangerButtonText}>Сбросить локальные данные</Text>
          </Pressable>
        </SettingSection>

        {feedback ? (
          <View
            style={[
              styles.messageBox,
              feedback.type === 'success' ? styles.successBox : styles.errorBox,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                feedback.type === 'success' ? styles.successText : styles.errorMessageText,
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        ) : (
          <EmptyState
            description="Здесь можно управлять аккаунтом, синхронизацией, уведомлениями и локальными резервными копиями."
            title="Параметры приложения"
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
  label: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  switchTextBlock: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  switchSubtitle: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
  },
  actionColumn: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
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
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: '#c2410c',
    fontSize: 15,
    fontWeight: '700',
  },
  messageBox: {
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
  },
  successBox: {
    backgroundColor: '#edf7ef',
  },
  errorBox: {
    backgroundColor: '#fff1e8',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: '#2f6f3e',
  },
  errorMessageText: {
    color: '#9a3412',
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.9,
  },
});
