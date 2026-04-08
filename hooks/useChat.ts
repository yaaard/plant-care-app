import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import { getChatMessagesByThreadId, getChatThreads } from '@/lib/chat-repo';
import { subscribeToLocalDataChanges } from '@/lib/local-events';
import { getErrorMessage } from '@/lib/validators';
import type { ChatMessage, ChatThreadListItem } from '@/types/chat';

export function useChatThreads(plantId?: string | null) {
  const [threads, setThreads] = useState<ChatThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const nextThreads = await getChatThreads({ plantId: plantId ?? null });
      setThreads(nextThreads);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'Не удалось загрузить историю диалогов.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribeToLocalDataChanges(() => {
      void reload();
    });
  }, [reload]);

  return {
    threads,
    loading,
    error,
    reload,
  };
}

export function useChatMessages(threadId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(threadId));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    try {
      const nextMessages = await getChatMessagesByThreadId(threadId);
      setMessages(nextMessages);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'Не удалось загрузить сообщения чата.'));
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribeToLocalDataChanges(() => {
      void reload();
    });
  }, [reload]);

  return {
    messages,
    loading,
    error,
    reload,
  };
}
