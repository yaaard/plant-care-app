import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/validators';

export default function AccountSettingsScreen() {
  const { user, signOut } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const confirmSignOut = () => {
    Alert.alert(
      'Выйти из аккаунта?',
      'Локальные данные текущего пользователя будут очищены с устройства.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await signOut();
              } catch (error) {
                setFeedback(getErrorMessage(error, 'Не удалось выйти из аккаунта.'));
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <PageHeader eyebrow="Account" title="Аккаунт" />

        {feedback ? <InlineBanner text={feedback} tone="error" /> : null}

        <SurfaceCard>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? 'Не удалось определить email'}</Text>

          <Text style={styles.label}>Статус</Text>
          <Text style={styles.value}>Вход выполнен</Text>

          <Button label="Выйти из аккаунта" onPress={confirmSignOut} tone="danger" />
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
