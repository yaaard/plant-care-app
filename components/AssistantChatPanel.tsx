import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { ChatMessageBubble } from '@/components/ChatMessageBubble';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { Button } from '@/components/ui/Button';
import { AppTheme } from '@/constants/theme';
import { useChatMessages, useChatThreads } from '@/hooks/useChat';
import { getAppliedAiActionIdsForChatMessages } from '@/lib/ai-action-history-repo';
import { executeAiAction } from '@/lib/ai-actions';
import { formatDateTime } from '@/lib/formatters';
import { sendAssistantMessage } from '@/lib/gemini-client';
import { pickImageFromLibraryAsync } from '@/lib/image-picker';
import { getPlantById } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';
import type { AiAction } from '@/types/ai-action';
import type { Plant } from '@/types/plant';

type Props = {
  plantId?: string | null;
  introTitle: string;
};

export function AssistantChatPanel({ plantId = null, introTitle }: Props) {
  const router = useRouter();
  const {
    threads,
    loading: threadsLoading,
    error: threadsError,
    reload: reloadThreads,
  } = useChatThreads(plantId);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null);
  const [appliedActionIds, setAppliedActionIds] = useState<string[]>([]);
  const [hiddenActionIds, setHiddenActionIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loadingPlant, setLoadingPlant] = useState(Boolean(plantId));
  const messagesScrollRef = useRef<ScrollView | null>(null);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    reload: reloadMessages,
  } = useChatMessages(selectedThreadId);

  const assistantMessageIds = useMemo(
    () => messages.filter((message) => message.role === 'assistant').map((message) => message.id),
    [messages]
  );

  const loadPlant = useCallback(async () => {
    if (!plantId) {
      setPlant(null);
      setLoadingPlant(false);
      return;
    }

    setLoadingPlant(true);

    try {
      const nextPlant = await getPlantById(plantId);
      setPlant(nextPlant);
    } catch {
      setPlant(null);
    } finally {
      setLoadingPlant(false);
    }
  }, [plantId]);

  const loadAppliedActions = useCallback(async () => {
    if (assistantMessageIds.length === 0) {
      setAppliedActionIds([]);
      return;
    }

    try {
      const nextIds = await getAppliedAiActionIdsForChatMessages(assistantMessageIds);
      setAppliedActionIds(Array.from(new Set(nextIds)));
    } catch {
      // Keep chat stable even if local history lookup fails.
    }
  }, [assistantMessageIds]);

  useFocusEffect(
    useCallback(() => {
      void loadPlant();
    }, [loadPlant])
  );

  useEffect(() => {
    if (threadsLoading) {
      return;
    }

    if (threads.length === 0) {
      if (!draftMode) {
        setDraftMode(true);
      }
      setSelectedThreadId(null);
      return;
    }

    if (draftMode) {
      return;
    }

    if (selectedThreadId && threads.some((thread) => thread.id === selectedThreadId)) {
      return;
    }

    setSelectedThreadId(threads[0]?.id ?? null);
  }, [draftMode, selectedThreadId, threads, threadsLoading]);

  useEffect(() => {
    void loadAppliedActions();
  }, [loadAppliedActions]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const timeout = setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => clearTimeout(timeout);
  }, [messages.length]);

  const handleSelectThread = (threadId: string) => {
    Keyboard.dismiss();
    setDraftMode(false);
    setSelectedThreadId(threadId);
    setFeedback(null);
    setHiddenActionIds([]);
  };

  const handleStartNewDialog = () => {
    Keyboard.dismiss();
    setDraftMode(true);
    setSelectedThreadId(null);
    setMessageText('');
    setAttachedImageUri(null);
    setFeedback(null);
    setHiddenActionIds([]);
  };

  const handlePickImage = async () => {
    try {
      Keyboard.dismiss();
      const nextUri = await pickImageFromLibraryAsync();

      if (nextUri) {
        setAttachedImageUri(nextUri);
        setFeedback(null);
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: getErrorMessage(error, 'Не удалось выбрать изображение для сообщения.'),
      });
    }
  };

  const handleSend = async () => {
    if (sending) {
      return;
    }

    if (!messageText.trim() && !attachedImageUri) {
      setFeedback({
        tone: 'error',
        text: 'Введите сообщение или прикрепите фото перед отправкой.',
      });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      Keyboard.dismiss();
      const response = await sendAssistantMessage({
        threadId: selectedThreadId,
        plantId,
        text: messageText,
        localImageUri: attachedImageUri,
      });

      setDraftMode(false);
      setSelectedThreadId(response.thread.id);
      setMessageText('');
      setAttachedImageUri(null);

      await Promise.all([reloadThreads(), reloadMessages(), loadAppliedActions()]);
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: getErrorMessage(error, 'Не удалось получить ответ помощника.'),
      });
    } finally {
      setSending(false);
    }
  };

  const handleApplyAction = async (action: AiAction, messageId: string) => {
    if (applyingActionId || appliedActionIds.includes(action.id)) {
      return;
    }

    setApplyingActionId(action.id);

    try {
      const result = await executeAiAction(action, {
        source: {
          plantId: plantId ?? ('plantId' in action.payload ? action.payload.plantId : null),
          chatMessageId: messageId,
        },
      });

      if (result.status === 'dismissed') {
        setHiddenActionIds((current) =>
          current.includes(action.id) ? current : [...current, action.id]
        );
      } else {
        setAppliedActionIds((current) =>
          current.includes(action.id) ? current : [...current, action.id]
        );
      }

      if (result.status === 'navigated') {
        router.push(result.navigationTarget as Href);
      }

      setFeedback({ tone: 'success', text: result.message });
      await Promise.all([reloadThreads(), reloadMessages(), loadPlant(), loadAppliedActions()]);
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: getErrorMessage(error, 'Не удалось применить действие.'),
      });
    } finally {
      setApplyingActionId(null);
    }
  };

  const waitingForThreadSelection =
    !threadsLoading && !draftMode && !selectedThreadId && threads.length > 0;
  const threadCountLabel = threads.length > 0 ? `${threads.length}` : '0';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      style={styles.flex}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topCopy}>
            <Text style={styles.title}>{introTitle}</Text>
          </View>
          <Button compact label="Новый" onPress={handleStartNewDialog} tone="secondary" />
        </View>

        {plantId ? (
          <View style={styles.contextRow}>
            <Ionicons color={AppTheme.colors.primaryStrong} name="leaf-outline" size={16} />
            <View style={styles.contextCopy}>
              <Text style={styles.contextTitle}>
                {loadingPlant ? 'Загружаем контекст растения...' : plant?.name ?? 'Контекст растения'}
              </Text>
              <Text style={styles.contextText}>
                {loadingPlant
                  ? 'Подождите пару секунд.'
                  : plant
                    ? `${plant.species} • обновлено ${formatDateTime(plant.updatedAt)}`
                    : 'Карточка растения сейчас недоступна.'}
              </Text>
            </View>
          </View>
        ) : null}

        {feedback ? <InlineBanner text={feedback.text} tone={feedback.tone} /> : null}

        <View style={styles.threadBar}>
          <View style={styles.threadBarHeader}>
            <Text style={styles.threadBarTitle}>Диалоги</Text>
            <Text style={styles.threadBarMeta}>{threadCountLabel}</Text>
          </View>

          {threadsLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={AppTheme.colors.primary} size="small" />
              <Text style={styles.helperText}>Загружаем историю диалогов...</Text>
            </View>
          ) : threads.length > 0 || draftMode ? (
            <ScrollView
              horizontal
              contentContainerStyle={styles.threadStrip}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
            >
              {draftMode ? (
                <Pressable style={[styles.threadChip, styles.threadChipActive]}>
                  <Text style={[styles.threadChipText, styles.threadChipTextActive]}>
                    Новый диалог
                  </Text>
                </Pressable>
              ) : null}

              {threads.map((thread) => {
                const active = !draftMode && thread.id === selectedThreadId;

                return (
                  <Pressable
                    key={thread.id}
                    onPress={() => handleSelectThread(thread.id)}
                    style={({ pressed }) => [
                      styles.threadChip,
                      active && styles.threadChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.threadChipText, active && styles.threadChipTextActive]}
                    >
                      {thread.title || 'Диалог без названия'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.helperText}>
              История пока пустая. Начните новый диалог и задайте первый вопрос.
            </Text>
          )}

          {threadsError ? <Text style={styles.errorText}>{threadsError}</Text> : null}
        </View>

        <View style={styles.chatShell}>
          {waitingForThreadSelection ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={AppTheme.colors.primary} />
              <Text style={styles.helperText}>Открываем диалог...</Text>
            </View>
          ) : messagesLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={AppTheme.colors.primary} />
              <Text style={styles.helperText}>Загружаем сообщения...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyConversation}>
              <Text style={styles.emptyConversationTitle}>Новый разговор</Text>
              <Text style={styles.emptyConversationText}>
                Напишите вопрос ниже, и помощник ответит с учетом текста, фото и контекста растения.
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={messagesScrollRef}
              contentContainerStyle={styles.messagesContent}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              showsVerticalScrollIndicator={false}
              style={styles.messagesScroll}
            >
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  appliedActionIds={appliedActionIds}
                  applyingActionId={applyingActionId}
                  hiddenActionIds={hiddenActionIds}
                  message={message}
                  onApplyAction={(action) => {
                    void handleApplyAction(action, message.id);
                  }}
                />
              ))}
            </ScrollView>
          )}

          {messagesError ? <Text style={styles.errorText}>{messagesError}</Text> : null}
        </View>

        <View style={styles.composerShell}>
          {attachedImageUri ? (
            <View style={styles.attachmentRow}>
              <Image source={{ uri: attachedImageUri }} style={styles.attachmentPreview} />
              <View style={styles.attachmentCopy}>
                <Text style={styles.attachmentTitle}>Фото прикреплено</Text>
                <Text style={styles.attachmentText}>
                  Помощник учтет изображение вместе с вашим сообщением.
                </Text>
              </View>
              <Pressable
                onPress={() => setAttachedImageUri(null)}
                style={({ pressed }) => [styles.removeAttachmentButton, pressed && styles.pressed]}
              >
                <Ionicons color={AppTheme.colors.textMuted} name="close-outline" size={18} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <Pressable
              onPress={() => {
                void handlePickImage();
              }}
              style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
            >
              <Ionicons color={AppTheme.colors.primaryStrong} name="image-outline" size={18} />
            </Pressable>

            <TextInput
              multiline
              onChangeText={setMessageText}
              placeholder="Напишите вопрос о растении..."
              placeholderTextColor={AppTheme.colors.textSoft}
              style={styles.input}
              textAlignVertical="top"
              value={messageText}
            />

            <Pressable
              disabled={sending}
              onPress={() => {
                void handleSend();
              }}
              style={({ pressed }) => [
                styles.sendButton,
                sending && styles.sendButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {sending ? (
                <ActivityIndicator color={AppTheme.colors.white} size="small" />
              ) : (
                <Ionicons color={AppTheme.colors.white} name="arrow-up-outline" size={18} />
              )}
            </Pressable>
          </View>

          <Text style={styles.footnote}>Ответ помощника носит рекомендательный характер.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
    paddingHorizontal: AppTheme.spacing.page,
    paddingTop: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.lg,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topCopy: {
    flex: 1,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  contextRow: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contextCopy: {
    flex: 1,
  },
  contextTitle: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  contextText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  threadBar: {
    marginBottom: 12,
  },
  threadBarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  threadBarTitle: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  threadBarMeta: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  threadStrip: {
    gap: 8,
    paddingRight: 12,
  },
  threadChip: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    maxWidth: 200,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  threadChipActive: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderColor: AppTheme.colors.primarySoft,
  },
  threadChipText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  threadChipTextActive: {
    color: AppTheme.colors.primaryStrong,
    fontWeight: '700',
  },
  chatShell: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    flex: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    padding: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.lg,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyConversation: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyConversationTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyConversationText: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  composerShell: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    padding: AppTheme.spacing.md,
  },
  attachmentRow: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.lg,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    padding: 10,
  },
  attachmentPreview: {
    borderRadius: 14,
    height: 52,
    width: 52,
  },
  attachmentCopy: {
    flex: 1,
  },
  attachmentTitle: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  attachmentText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  removeAttachmentButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  composerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
  },
  sideButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  input: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 140,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendButtonDisabled: {
    opacity: 0.9,
  },
  footnote: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  helperText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: AppTheme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.9,
  },
});
