import type { PlantAiAnalysis } from '@/types/ai-analysis';
import type { AiActionHistory } from '@/types/ai-action';
import type { ChatMessage, ChatThread } from '@/types/chat';
import type { CareLog } from '@/types/log';
import type { Plant } from '@/types/plant';
import type { AppSettings } from '@/types/settings';
import type { CareTask } from '@/types/task';

export interface BackupMetadata {
  appVersion: string;
  exportedAt: string;
  schemaVersion: number;
}

export interface AppBackup {
  metadata: BackupMetadata;
  plants: Plant[];
  careTasks: CareTask[];
  careLogs: CareLog[];
  aiAnalyses: PlantAiAnalysis[];
  aiActionHistory: AiActionHistory[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  settings: AppSettings;
}

export interface BackupExportResult {
  fileName: string;
  fileUri: string;
  backup: AppBackup;
}

export interface ParsedBackupFile {
  fileName: string;
  backup: AppBackup;
}
