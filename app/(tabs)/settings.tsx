import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SettingsLinkCard } from '@/components/settings/SettingsLinkCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { formatDateTime } from '@/lib/formatters';
import { getSettings } from '@/lib/settings-repo';

export default function SettingsHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pendingChangesCount, lastSyncAt, syncError } = useSync();
  const [notificationsSummary, setNotificationsSummary] = useState('Загружаем...');

  const loadSummary = useCallback(async () => {
    try {
      const settings = await getSettings();
      setNotificationsSummary(
        settings.notificationsEnabled
          ? `${String(settings.notificationHour).padStart(2, '0')}:${String(
              settings.notificationMinute
            ).padStart(2, '0')}`
          : 'Выключены'
      );
    } catch {
      setNotificationsSummary('Недоступны');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Profile"
          side={
            <View style={styles.sideBadge}>
              <Text style={styles.sideBadgeValue}>{pendingChangesCount}</Text>
              <Text style={styles.sideBadgeLabel}>изменений</Text>
            </View>
          }
          title="Профиль"
        >
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Ionicons color={AppTheme.colors.primaryStrong} name="person-outline" size={22} />
            </View>
            <View style={styles.accountCopy}>
              <Text numberOfLines={1} style={styles.accountEmail}>
                {user?.email ?? 'Аккаунт не найден'}
              </Text>
              <Text style={styles.accountMeta}>
                {formatDateTime(lastSyncAt, 'Синхронизации ещё не было')}
              </Text>
            </View>
          </View>
        </PageHeader>

        {syncError ? <InlineBanner text={syncError} tone="error" /> : null}

        <SettingsLinkCard
          icon="person-circle-outline"
          onPress={() => router.push('/settings/account')}
          title="Аккаунт"
          value="Профиль"
        />

        <SettingsLinkCard
          icon="sync-outline"
          onPress={() => router.push('/settings/sync')}
          title="Синхронизация"
          value={pendingChangesCount > 0 ? `${pendingChangesCount} в очереди` : 'В норме'}
        />

        <SettingsLinkCard
          icon="notifications-outline"
          onPress={() => router.push('/settings/notifications')}
          title="Уведомления"
          value={notificationsSummary}
        />

        <SettingsLinkCard
          icon="cloud-download-outline"
          onPress={() => router.push('/settings/backup')}
          title="Резервная копия"
          value="JSON"
        />
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
  sideBadge: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.xl,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sideBadgeValue: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  sideBadgeLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.xl,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  accountCopy: {
    flex: 1,
  },
  accountEmail: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  accountMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
