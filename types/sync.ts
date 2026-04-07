export type SyncStatus = 'pending' | 'synced' | 'error';

export interface SyncResult {
  finishedAt: string;
  pushed: number;
  pulled: number;
}

export interface LocalSyncOverview {
  anonymousPlants: number;
  anonymousTasks: number;
  anonymousLogs: number;
  hasAnonymousData: boolean;
  hasForeignData: boolean;
}

export interface SyncContextValue {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  pendingChangesCount: number;
  syncNow: () => Promise<boolean>;
  dismissSyncError: () => void;
}
