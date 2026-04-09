import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { FormField } from '@/components/FormField';
import { AppTheme } from '@/constants/theme';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { getSettings, updateSettings } from '@/lib/settings-repo';
import {
  getErrorMessage,
  normalizeSettingsFormValues,
  validateSettings,
} from '@/lib/validators';

type FeedbackState = {
  type: 'success' | 'error';
  text: string;
} | null;

export default function NotificationsSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationHour, setNotificationHour] = useState('9');
  const [notificationMinute, setNotificationMinute] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const settings = await getSettings();
      setNotificationsEnabled(Boolean(settings.notificationsEnabled));
      setNotificationHour(String(settings.notificationHour));
      setNotificationMinute(String(settings.notificationMinute));
      setFeedback(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Не удалось загрузить настройки уведомлений.'),
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

  const handleSave = async () => {
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

    setSaving(true);

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
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PageHeader eyebrow="Notifications" title="Уведомления" />

          {feedback ? <InlineBanner text={feedback.text} tone={feedback.type} /> : null}

          <SurfaceCard>
            <View style={styles.switchRow}>
              <View style={styles.switchTextBlock}>
                <Text style={styles.switchTitle}>Локальные напоминания</Text>
                <Text style={styles.switchSubtitle}>
                  Если отключить, новые уведомления больше не будут создаваться.
                </Text>
              </View>

              <Switch
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#cfd6cf', true: '#93bea0' }}
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

            <Button
              disabled={saving || loading}
              label={saving ? 'Сохраняем...' : 'Сохранить настройки'}
              onPress={() => {
                void handleSave();
              }}
            />
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: AppTheme.spacing.page,
    paddingBottom: AppTheme.spacing.xxxl,
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
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  switchSubtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
