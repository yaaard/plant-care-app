import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AssistantChatPanel } from '@/components/AssistantChatPanel';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PlantAssistantChatScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId = normalizeParam(params.id) ?? null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Помощник по растению' }} />
      <AssistantChatPanel
        introDescription="Помощник учитывает карточку растения, историю ухода и может разбирать ваши фото и вопросы в контексте именно этого растения."
        introTitle="Диалог по растению"
        plantId={plantId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
});
