import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { FormField } from '@/components/FormField';
import { SectionTitle } from '@/components/SectionTitle';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { getSettings, updateSettings } from '@/lib/settings-repo';
import {
  getErrorMessage,
  normalizeSettingsFormValues,
  validateSettings,
} from '@/lib/validators';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationHour, setNotificationHour] = useState('9');
  const [notificationMinute, setNotificationMinute] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const settings = await getSettings();
      setNotificationsEnabled(Boolean(settings.notificationsEnabled));
      setNotificationHour(String(settings.notificationHour));
      setNotificationMinute(String(settings.notificationMinute));
      setErrorMessage(null);
      setSaveMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось загрузить настройки.'));
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
      setErrorMessage(errors.join('\n'));
      setSaveMessage(null);
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
        setSaveMessage(
          'Настройки сохранены, но система не дала доступ к уведомлениям. Напоминания не будут показаны.'
        );
      } else {
        setSaveMessage('Настройки сохранены.');
      }

      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось сохранить настройки.'));
      setSaveMessage(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Настройки" />

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextBlock}>
              <Text style={styles.switchTitle}>Локальные напоминания</Text>
              <Text style={styles.switchSubtitle}>
                Одно уведомление на каждую активную задачу полива.
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
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}

        <Pressable
          disabled={saving || loading}
          onPress={() => {
            void handleSave();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || saving || loading) && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Сохраняем...' : 'Сохранить настройки'}
          </Text>
        </Pressable>
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
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
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
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  successText: {
    color: '#2f6f3e',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.9,
  },
});
