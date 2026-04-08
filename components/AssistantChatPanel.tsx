import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ChatMessageBubble } from '@/components/ChatMessageBubble';
import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { useChatMessages, useChatThreads } from '@/hooks/useChat';
import { sendAssistantMessage } from '@/lib/gemini-client';
import { pickImageFromLibraryAsync } from '@/lib/image-picker';
import { getPlantById } from '@/lib/plants-repo';
import { formatDateTime } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/validators';
import type { Plant } from '@/types/plant';

type Props = {
  plantId?: string | null;
  introTitle: string;
  introDescription: string;
};

export function AssistantChatPanel({ plantId = null, introTitle, introDescription }: Props) {
  const { threads, loading: threadsLoading, error: threadsError, reload: reloadThreads } =
    useChatThreads(plantId);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loadingPlant, setLoadingPlant] = useState(Boolean(plantId));

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    reload: reloadMessages,
  } = useChatMessages(selectedThreadId);

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

  useFocusEffect(
    useCallback(() => {
      void loadPlant();
    }, [loadPlant])
  );

  useEffect(() => {
    if (draftMode) {
      return;
    }

    if (selectedThreadId && threads.some((thread) => thread.id === selectedThreadId)) {
      return;
    }

    setSelectedThreadId(threads[0]?.id ?? null);
  }, [draftMode, selectedThreadId, threads]);

  const handleSelectThread = (threadId: string) => {
    setDraftMode(false);
    setSelectedThreadId(threadId);
    setFeedback(null);
  };

  const handleStartNewDialog = () => {
    setDraftMode(true);
    setSelectedThreadId(null);
    setMessageText('');
    setAttachedImageUri(null);
    setFeedback(null);
  };

  const handlePickImage = async () => {
    try {
      const nextUri = await pickImageFromLibraryAsync();

      if (nextUri) {
        setAttachedImageUri(nextUri);
        setFeedback(null);
      }
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Не удалось выбрать изображение для сообщения.'));
    }
  };

  const handleSend = async () => {
    if (sending) {
      return;
    }

    if (!messageText.trim() && !attachedImageUri) {
      setFeedback('Введите сообщение или прикрепите фото перед отправкой.');
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
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

      await reloadThreads();
      await reloadMessages();
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Не удалось получить ответ помощника.'));
    } finally {
      setSending(false);
    }
  };

  const conversationEmpty = !selectedThreadId && !draftMode;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <SectionTitle title="Помощник" />
          <Text style={styles.bodyText}>{introDescription}</Text>

          {plantId ? (
            <View style={styles.contextCard}>
              <Text style={styles.contextTitle}>
                {loadingPlant
                  ? 'Загружаем контекст растения...'
                  : plant
                    ? plant.name
                    : 'Растение не найдено'}
              </Text>
              <Text style={styles.contextSubtitle}>
                {plant
                  ? `${plant.species} · обновлено ${formatDateTime(plant.updatedAt)}`
                  : 'Можно задать общий вопрос, но без карточки растения контекст будет неполным.'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <SectionTitle title="Диалоги" />
            <Pressable onPress={handleStartNewDialog} style={styles.inlineButton}>
              <Text style={styles.inlineButtonText}>Новый диалог</Text>
            </Pressable>
          </View>

          {threadsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2f6f3e" />
              <Text style={styles.loadingText}>Загружаем историю диалогов...</Text>
            </View>
          ) : threads.length === 0 ? (
            <Text style={styles.bodyText}>
              История пока пуста. Начните новый диалог и задайте вопрос о растении.
            </Text>
          ) : (
            <ScrollView
              contentContainerStyle={styles.threadWrap}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {threads.map((thread) => {
                const active = !draftMode && thread.id === selectedThreadId;

                return (
                  <Pressable
                    key={thread.id}
                    onPress={() => handleSelectThread(thread.id)}
                    style={[styles.threadChip, active && styles.threadChipActive]}
                  >
                    <Text style={[styles.threadChipTitle, active && styles.threadChipTitleActive]}>
                      {thread.title || 'Диалог без названия'}
                    </Text>
                    <Text style={[styles.threadChipMeta, active && styles.threadChipMetaActive]}>
                      {thread.lastMessageText || 'Сообщений пока нет'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {threadsError ? <Text style={styles.errorText}>{threadsError}</Text> : null}
        </View>

        <View style={styles.card}>
          <SectionTitle title={introTitle} />

          {conversationEmpty ? (
            <EmptyState
              description="Выберите существующий диалог выше или нажмите “Новый диалог”, чтобы начать разговор с помощником."
              title="Диалог не выбран"
            />
          ) : messagesLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2f6f3e" />
              <Text style={styles.loadingText}>Загружаем сообщения...</Text>
            </View>
          ) : messages.length === 0 ? (
            <EmptyState
              description="Отправьте первый вопрос, и помощник ответит с учётом текста, фото и контекста растения."
              title="Сообщений пока нет"
            />
          ) : (
            messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
          )}

          {messagesError ? <Text style={styles.errorText}>{messagesError}</Text> : null}
        </View>

        <View style={styles.card}>
          <SectionTitle title="Новое сообщение" />

          {attachedImageUri ? (
            <View style={styles.attachmentCard}>
              <Image source={{ uri: attachedImageUri }} style={styles.attachmentPreview} />
              <Pressable onPress={() => setAttachedImageUri(null)} style={styles.removeAttachment}>
                <Text style={styles.removeAttachmentText}>Убрать фото</Text>
              </Pressable>
            </View>
          ) : null}

          <TextInput
            multiline
            onChangeText={setMessageText}
            placeholder="Напишите вопрос о растении..."
            placeholderTextColor="#94a3b8"
            style={styles.input}
            textAlignVertical="top"
            value={messageText}
          />

          <View style={styles.composerActions}>
            <Pressable
              disabled={sending}
              onPress={() => {
                void handlePickImage();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || sending) && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Прикрепить фото</Text>
            </Pressable>

            <Pressable
              disabled={sending}
              onPress={() => {
                void handleSend();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || sending) && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {sending ? 'Отправка...' : 'Отправить'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footnote}>
            AI-ответ носит рекомендательный характер и не заменяет очный осмотр растения.
          </Text>
          {feedback ? <Text style={styles.errorText}>{feedback}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  bodyText: {
    color: '#163020',
    fontSize: 14,
    lineHeight: 21,
  },
  contextCard: {
    backgroundColor: '#f7faf7',
    borderRadius: 16,
    marginTop: 14,
    padding: 14,
  },
  contextTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
  },
  contextSubtitle: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineButton: {
    backgroundColor: '#edf7ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineButtonText: {
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '700',
  },
  threadWrap: {
    gap: 10,
    paddingTop: 8,
  },
  threadChip: {
    backgroundColor: '#f4f7f3',
    borderRadius: 16,
    maxWidth: 220,
    minWidth: 180,
    padding: 12,
  },
  threadChipActive: {
    backgroundColor: '#2f6f3e',
  },
  threadChipTitle: {
    color: '#163020',
    fontSize: 14,
    fontWeight: '700',
  },
  threadChipTitleActive: {
    color: '#ffffff',
  },
  threadChipMeta: {
    color: '#667085',
    fontSize: 12,
    marginTop: 4,
  },
  threadChipMetaActive: {
    color: '#d8f1de',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    color: '#163020',
    fontSize: 14,
  },
  attachmentCard: {
    marginBottom: 12,
  },
  attachmentPreview: {
    borderRadius: 16,
    height: 180,
    width: 180,
  },
  removeAttachment: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  removeAttachmentText: {
    color: '#9a3412',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f7faf7',
    borderColor: '#d5ddd2',
    borderRadius: 16,
    borderWidth: 1,
    color: '#163020',
    fontSize: 15,
    minHeight: 120,
    padding: 14,
  },
  composerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#edf7ef',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#2f6f3e',
    fontSize: 15,
    fontWeight: '700',
  },
  footnote: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  pressed: {
    opacity: 0.9,
  },
});
