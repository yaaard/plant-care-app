import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AiActionList } from '@/components/AiActionList';
import { AppTheme } from '@/constants/theme';
import { formatDateTime } from '@/lib/formatters';
import { getPlantPhotoPublicUrl } from '@/lib/storage';
import type { AiAction } from '@/types/ai-action';
import type { ChatMessage } from '@/types/chat';

type Props = {
  message: ChatMessage;
  onApplyAction?: (action: AiAction, message: ChatMessage) => void;
  applyingActionId?: string | null;
  appliedActionIds?: string[];
  hiddenActionIds?: string[];
};

export function ChatMessageBubble({
  message,
  onApplyAction,
  applyingActionId = null,
  appliedActionIds = [],
  hiddenActionIds = [],
}: Props) {
  const isAssistant = message.role === 'assistant';
  const imageUri = useMemo(
    () => (message.imagePath ? getPlantPhotoPublicUrl(message.imagePath) : null),
    [message.imagePath]
  );

  return (
    <View style={[styles.row, isAssistant ? styles.assistantRow : styles.userRow]}>
      <View style={[styles.bubble, isAssistant ? styles.assistantBubble : styles.userBubble]}>
        <View style={styles.header}>
          <Text style={[styles.roleLabel, isAssistant ? styles.assistantLabel : styles.userLabel]}>
            {isAssistant ? 'Помощник' : message.role === 'system' ? 'Система' : 'Вы'}
          </Text>
          <Text style={[styles.meta, isAssistant ? styles.assistantMeta : styles.userMeta]}>
            {formatDateTime(message.createdAt)}
          </Text>
        </View>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

        {message.text ? (
          <Text style={[styles.text, isAssistant ? styles.assistantText : styles.userText]}>
            {message.text}
          </Text>
        ) : null}

        {isAssistant && message.actions.length > 0 && onApplyAction ? (
        <AiActionList
          actions={message.actions}
          appliedActionIds={appliedActionIds}
          applyingActionId={applyingActionId}
          hideApplied
          hiddenActionIds={hiddenActionIds}
          onApply={(action) => onApplyAction(action, message)}
          title="Можно сделать сразу"
        />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 14,
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 26,
    maxWidth: '92%',
    overflow: 'hidden',
    padding: 15,
  },
  assistantBubble: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderTopLeftRadius: 12,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: AppTheme.colors.primary,
    borderTopRightRadius: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  assistantLabel: {
    color: AppTheme.colors.primaryStrong,
  },
  userLabel: {
    color: 'rgba(255,255,255,0.85)',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  assistantText: {
    color: AppTheme.colors.text,
  },
  userText: {
    color: AppTheme.colors.white,
  },
  meta: {
    fontSize: 11,
  },
  assistantMeta: {
    color: AppTheme.colors.textSoft,
  },
  userMeta: {
    color: 'rgba(255,255,255,0.75)',
  },
  image: {
    borderRadius: 18,
    height: 188,
    marginBottom: 10,
    width: 188,
  },
});
