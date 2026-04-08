import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { formatDateTime } from '@/lib/formatters';
import { getPlantPhotoPublicUrl } from '@/lib/storage';
import type { ChatMessage } from '@/types/chat';

type Props = {
  message: ChatMessage;
};

export function ChatMessageBubble({ message }: Props) {
  const isAssistant = message.role === 'assistant';
  const imageUri = useMemo(
    () => (message.imagePath ? getPlantPhotoPublicUrl(message.imagePath) : null),
    [message.imagePath]
  );

  return (
    <View style={[styles.row, isAssistant ? styles.assistantRow : styles.userRow]}>
      <View style={[styles.bubble, isAssistant ? styles.assistantBubble : styles.userBubble]}>
        <Text style={[styles.roleLabel, isAssistant ? styles.assistantLabel : styles.userLabel]}>
          {isAssistant ? 'Помощник' : message.role === 'system' ? 'Система' : 'Вы'}
        </Text>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

        {message.text ? (
          <Text style={[styles.text, isAssistant ? styles.assistantText : styles.userText]}>
            {message.text}
          </Text>
        ) : null}

        <Text style={[styles.meta, isAssistant ? styles.assistantMeta : styles.userMeta]}>
          {formatDateTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 18,
    maxWidth: '88%',
    padding: 14,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: '#2f6f3e',
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  assistantLabel: {
    color: '#667085',
  },
  userLabel: {
    color: '#d8f1de',
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  assistantText: {
    color: '#163020',
  },
  userText: {
    color: '#ffffff',
  },
  meta: {
    fontSize: 12,
    marginTop: 8,
  },
  assistantMeta: {
    color: '#667085',
  },
  userMeta: {
    color: '#d8f1de',
  },
  image: {
    borderRadius: 14,
    height: 180,
    marginBottom: 10,
    width: 180,
  },
});
