import { SafeAreaView, StyleSheet } from 'react-native';

import { AssistantChatPanel } from '@/components/AssistantChatPanel';

export default function AssistantTabScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AssistantChatPanel
        introDescription="Помощник отвечает на вопросы по уходу за комнатными растениями, помогает разбирать симптомы и может учитывать прикреплённые фото."
        introTitle="Текущий диалог"
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
