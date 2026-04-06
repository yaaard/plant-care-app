import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeDatabase } from '@/lib/db-init';
import { configureNotificationHandler, refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { getErrorMessage } from '@/lib/validators';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    configureNotificationHandler();

    void (async () => {
      try {
        await initializeDatabase();
        await refreshScheduledNotificationsAsync();

        if (isMounted) {
          setIsReady(true);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error, 'Не удалось подготовить приложение к запуску.'));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (errorMessage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Ошибка запуска</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2f6f3e" size="large" />
        <Text style={styles.loadingText}>Подготавливаем локальную базу и напоминания...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plant/add" options={{ title: 'Добавить растение' }} />
        <Stack.Screen name="plant/[id]" options={{ title: 'Карточка растения' }} />
        <Stack.Screen name="plant/edit/[id]" options={{ title: 'Редактировать растение' }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Задача' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Информация' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: '#f6f7f2',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#163020',
    fontSize: 15,
    marginTop: 14,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#9a3412',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#7c2d12',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
