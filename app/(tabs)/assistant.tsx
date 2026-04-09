import { SafeAreaView, StyleSheet } from 'react-native';

import { AssistantChatPanel } from '@/components/AssistantChatPanel';
import { AppTheme } from '@/constants/theme';

export default function AssistantTabScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AssistantChatPanel introTitle="Помощник" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
});
