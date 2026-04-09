import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { AppTheme } from '@/constants/theme';
import { useSync } from '@/hooks/useSync';
import { formatDateTime } from '@/lib/formatters';

export default function SyncSettingsScreen() {
  const {
    isSyncing,
    lastSyncAt,
    syncError,
    pendingChangesCount,
    syncNow,
    dismissSyncError,
  } = useSync();

  const handleManualSync = async () => {
    dismissSyncError();
    await syncNow();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <PageHeader eyebrow="Sync" title="Синхронизация" />

        {syncError ? <InlineBanner text={syncError} tone="error" /> : null}

        <SurfaceCard>
          <Text style={styles.label}>Последняя синхронизация</Text>
          <Text style={styles.value}>{formatDateTime(lastSyncAt, 'Ещё не выполнялась')}</Text>

          <Text style={styles.label}>Ожидают отправки</Text>
          <Text style={styles.value}>{pendingChangesCount}</Text>

          <Button
            label={isSyncing ? 'Синхронизируем...' : 'Синхронизировать сейчас'}
            onPress={() => {
              void handleManualSync();
            }}
          />
        </SurfaceCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: AppTheme.spacing.page,
  },
  label: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
});
