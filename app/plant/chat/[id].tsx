import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AssistantChatPanel } from '@/components/AssistantChatPanel';
import { AppTheme } from '@/constants/theme';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PlantAssistantChatScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id) ?? null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Помощник по растению' }} />
      <AssistantChatPanel introTitle="Помощник" plantId={plantId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
});
