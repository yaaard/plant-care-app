import { AI_ACTION_JSON_SCHEMA, normalizeAiActionArray } from '@/shared/ai-action-schema';
import type { AiAction } from '@/types/ai-action';

export interface AssistantChatStructuredResult {
  reply: string;
  actions: AiAction[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeReply(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Поле reply отсутствует или пустое.');
  }

  return value.trim();
}

export const ASSISTANT_CHAT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'actions'],
  properties: {
    reply: {
      type: 'string',
      maxLength: 700,
    },
    actions: AI_ACTION_JSON_SCHEMA,
  },
} as const;

export function normalizeAssistantChatStructuredResult(
  input: unknown,
  context: Parameters<typeof normalizeAiActionArray>[1] = {}
): AssistantChatStructuredResult {
  if (!isObject(input)) {
    throw new Error('Ответ помощника вернулся в неподдерживаемом формате.');
  }

  return {
    reply: normalizeReply(input.reply),
    actions: normalizeAiActionArray(input.actions, context),
  };
}
