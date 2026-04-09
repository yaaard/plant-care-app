import type { CareTaskType } from '@/types/task';
import type { RiskLevel } from '@/types/risk';
import type { SyncStatus } from '@/types/sync';

export const AI_ACTION_TYPES = [
  'create_task',
  'update_watering_interval',
  'mark_attention',
  'open_catalog_entry',
  'open_plant_details',
  'open_schedule',
  'dismiss',
] as const;

export type AiActionType = (typeof AI_ACTION_TYPES)[number];

export type AiActionPayloadMap = {
  create_task: {
    plantId: string;
    taskType: CareTaskType;
    scheduledDate?: string | null;
    reason?: string | null;
  };
  update_watering_interval: {
    plantId: string;
    newIntervalDays: number;
  };
  mark_attention: {
    plantId: string;
    riskLevel?: RiskLevel;
    note?: string | null;
  };
  open_catalog_entry: {
    catalogPlantId: string;
  };
  open_plant_details: {
    plantId: string;
  };
  open_schedule: Record<string, never>;
  dismiss: Record<string, never>;
};

export type AiAction<TType extends AiActionType = AiActionType> = TType extends AiActionType
  ? {
      id: string;
      type: TType;
      title: string;
      description?: string;
      payload: AiActionPayloadMap[TType];
      createdAt?: string;
    }
  : never;

export type AiActionExecutionSource = {
  plantId?: string | null;
  analysisId?: string | null;
  chatMessageId?: string | null;
};

export interface AiActionHistory {
  id: string;
  userId: string | null;
  plantId: string | null;
  analysisId: string | null;
  chatMessageId: string | null;
  actionType: AiActionType;
  actionPayload: string;
  appliedAt: string;
  createdAt: string;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export type AiActionExecutionResult =
  | {
      status: 'applied';
      action: AiAction;
      message: string;
      requiresReload?: boolean;
    }
  | {
      status: 'navigated';
      action: AiAction;
      message: string;
      navigationTarget:
        | { pathname: '/catalog/[id]'; params: { id: string } }
        | { pathname: '/plant/[id]'; params: { id: string } }
        | { pathname: '/(tabs)/schedule' };
    }
  | {
      status: 'dismissed';
      action: AiAction;
      message: string;
    };
