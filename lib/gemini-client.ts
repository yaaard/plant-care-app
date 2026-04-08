import {
  AI_ANALYSIS_FUNCTION_NAME,
  ASSISTANT_CHAT_FUNCTION_NAME,
} from '@/constants/defaultValues';
import { upsertAiAnalysisLocally } from '@/lib/ai-analyses-repo';
import { upsertChatConversationLocally } from '@/lib/chat-repo';
import { createId } from '@/lib/db';
import { uploadAssistantImage } from '@/lib/storage';
import { getSupabaseClient } from '@/lib/supabase';
import type { PlantAiAnalysis } from '@/types/ai-analysis';
import type { AssistantChatFunctionResponse, ChatMessage, ChatThread } from '@/types/chat';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`В ответе AI отсутствует поле ${fieldName}.`);
  }

  return value.trim();
}

function getNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getStringArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Поле ${fieldName} должно быть массивом строк.`);
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAiAnalysis(value: unknown): PlantAiAnalysis {
  if (!isObject(value)) {
    throw new Error('Edge Function вернула неподдерживаемый формат анализа.');
  }

  const overallCondition =
    value.overallCondition === 'healthy' ||
    value.overallCondition === 'needs_attention' ||
    value.overallCondition === 'at_risk'
      ? value.overallCondition
      : null;
  const urgency =
    value.urgency === 'low' || value.urgency === 'medium' || value.urgency === 'high'
      ? value.urgency
      : null;

  if (!overallCondition || !urgency) {
    throw new Error('Edge Function вернула анализ с неподдерживаемыми значениями статуса.');
  }

  return {
    id: getRequiredString(value.id, 'id'),
    userId: getNullableString(value.userId),
    plantId: getRequiredString(value.plantId, 'plantId'),
    photoPath: getNullableString(value.photoPath),
    modelName: getRequiredString(value.modelName, 'modelName'),
    summary: getRequiredString(value.summary, 'summary'),
    overallCondition,
    urgency,
    observedSigns: getStringArray(value.observedSigns, 'observedSigns'),
    possibleCauses: getStringArray(value.possibleCauses, 'possibleCauses'),
    wateringAdvice: getRequiredString(value.wateringAdvice, 'wateringAdvice'),
    lightAdvice: getRequiredString(value.lightAdvice, 'lightAdvice'),
    humidityAdvice: getRequiredString(value.humidityAdvice, 'humidityAdvice'),
    recommendedActions: getStringArray(value.recommendedActions, 'recommendedActions'),
    confidenceNote: getRequiredString(value.confidenceNote, 'confidenceNote'),
    rawJson:
      typeof value.rawJson === 'string' && value.rawJson.trim()
        ? value.rawJson
        : JSON.stringify(value.rawJson ?? {}),
    createdAt: getRequiredString(value.createdAt, 'createdAt'),
    updatedAt: getRequiredString(value.updatedAt, 'updatedAt'),
    syncStatus:
      value.syncStatus === 'pending' ||
      value.syncStatus === 'synced' ||
      value.syncStatus === 'error'
        ? value.syncStatus
        : 'synced',
    remoteUpdatedAt: getNullableString(value.remoteUpdatedAt),
  };
}

function normalizeThread(value: unknown): ChatThread {
  if (!isObject(value)) {
    throw new Error('Формат треда чата не поддерживается.');
  }

  return {
    id: getRequiredString(value.id, 'thread.id'),
    userId: getNullableString(value.userId),
    plantId: getNullableString(value.plantId),
    title: getNullableString(value.title),
    createdAt: getRequiredString(value.createdAt, 'thread.createdAt'),
    updatedAt: getRequiredString(value.updatedAt, 'thread.updatedAt'),
    syncStatus:
      value.syncStatus === 'pending' ||
      value.syncStatus === 'error' ||
      value.syncStatus === 'synced'
        ? value.syncStatus
        : 'synced',
    remoteUpdatedAt: getNullableString(value.remoteUpdatedAt),
  };
}

function normalizeMessage(value: unknown): ChatMessage {
  if (!isObject(value)) {
    throw new Error('Формат сообщения чата не поддерживается.');
  }

  const role =
    value.role === 'assistant' || value.role === 'system' || value.role === 'user'
      ? value.role
      : null;

  if (!role) {
    throw new Error('В сообщении чата передана неизвестная роль.');
  }

  return {
    id: getRequiredString(value.id, 'message.id'),
    threadId: getRequiredString(value.threadId, 'message.threadId'),
    userId: getNullableString(value.userId),
    role,
    text: typeof value.text === 'string' ? value.text : '',
    imagePath: getNullableString(value.imagePath),
    createdAt: getRequiredString(value.createdAt, 'message.createdAt'),
    updatedAt: getRequiredString(value.updatedAt, 'message.updatedAt'),
    syncStatus:
      value.syncStatus === 'pending' ||
      value.syncStatus === 'error' ||
      value.syncStatus === 'synced'
        ? value.syncStatus
        : 'synced',
    remoteUpdatedAt: getNullableString(value.remoteUpdatedAt),
  };
}

function normalizeAssistantChatResponse(value: unknown): AssistantChatFunctionResponse {
  if (!isObject(value) || !('thread' in value) || !('messages' in value)) {
    throw new Error('Edge Function вернула неподдерживаемый ответ чата.');
  }

  if (!Array.isArray(value.messages)) {
    throw new Error('Ответ чата не содержит список сообщений.');
  }

  return {
    thread: normalizeThread(value.thread),
    messages: value.messages.map(normalizeMessage),
  };
}

async function getAuthorizedClientState() {
  const client = getSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token || !session.user) {
    throw new Error('Для AI-функций нужна активная авторизация.');
  }

  return {
    client,
    session,
  };
}

export async function requestPlantAiAnalysis(plantId: string) {
  const { client, session } = await getAuthorizedClientState();
  const { data, error } = await client.functions.invoke(AI_ANALYSIS_FUNCTION_NAME, {
    body: { plantId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw error;
  }

  if (!isObject(data) || !('analysis' in data)) {
    throw new Error('Edge Function вернула неподдерживаемый ответ.');
  }

  const normalized = normalizeAiAnalysis((data as { analysis: unknown }).analysis);
  await upsertAiAnalysisLocally(normalized);

  return normalized;
}

export async function sendAssistantMessage(input: {
  threadId?: string | null;
  plantId?: string | null;
  text?: string;
  localImageUri?: string | null;
  imagePath?: string | null;
}) {
  const { client, session } = await getAuthorizedClientState();
  const threadId = input.threadId?.trim() || createId('chat-thread');
  const text = input.text?.trim() ?? '';
  let imagePath = input.imagePath ?? null;

  if (!text && !input.localImageUri && !imagePath) {
    throw new Error('Введите сообщение или прикрепите фото перед отправкой.');
  }

  if (input.localImageUri?.trim()) {
    const uploaded = await uploadAssistantImage({
      userId: session.user.id,
      threadId,
      localUri: input.localImageUri,
    });
    imagePath = uploaded.photoPath;
  }

  const { data, error } = await client.functions.invoke(ASSISTANT_CHAT_FUNCTION_NAME, {
    body: {
      threadId,
      plantId: input.plantId ?? null,
      text,
      imagePath,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw error;
  }

  const normalized = normalizeAssistantChatResponse(data);
  await upsertChatConversationLocally(normalized);

  return normalized;
}
