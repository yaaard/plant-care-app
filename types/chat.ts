import type { SyncStatus } from '@/types/sync';
import type { AiAction } from '@/types/ai-action';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatThread {
  id: string;
  userId: string | null;
  plantId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export interface ChatThreadListItem extends ChatThread {
  lastMessageText: string | null;
  lastMessageAt: string | null;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  userId: string | null;
  role: ChatRole;
  text: string;
  imagePath: string | null;
  actions: AiAction[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export interface AssistantChatFunctionResponse {
  thread: ChatThread;
  messages: ChatMessage[];
}
