export type ShiyanTaskLifecycle = 'active' | 'ready' | 'completed' | 'cancelled';
export type ShiyanStageStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

export interface ShiyanApiErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  requestId: string;
  taskId?: string;
}

export interface ShiyanApiSuccessEnvelope<T> {
  ok: true;
  data: T;
  requestId: string;
}

export type ShiyanApiEnvelope<T> =
  | ShiyanApiSuccessEnvelope<T>
  | ShiyanApiErrorEnvelope;

export interface ShiyanCaptureStageView {
  stage: string;
  status: ShiyanStageStatus;
  retryable: boolean;
  retryCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

export interface ShiyanCaptureTaskView {
  id: string;
  deviceId: string;
  userId: string | null;
  title: string;
  sceneId: string;
  lifecycle: ShiyanTaskLifecycle;
  currentStage: string;
  createdAt: string;
  updatedAt: string;
  stages: ShiyanCaptureStageView[];
}

export interface ShiyanUploadGrant {
  assetId: string;
  objectKey: string;
  method: 'PUT';
  url: string;
  expiresAt: string;
  headers: {
    'content-type': string;
  };
}

export interface ShiyanTranscriptSegmentView {
  startMs: number;
  endMs: number;
  text: string;
}

export interface ShiyanTranscriptView {
  id: string;
  taskId: string;
  sourceAssetId: string;
  text: string;
  language: string | null;
  durationMs: number | null;
  segments: ShiyanTranscriptSegmentView[];
  provider: string;
  model: string;
  providerRequestId: string | null;
  providerMetadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface ShiyanAudioRetentionView {
  assetId: string;
  retained: boolean;
  deleteAfter: string | null;
  deletedAt: string | null;
}

export interface ShiyanStageRetryView {
  taskId: string;
  stage: 'transcribe' | 'organize';
  retryCount: number;
}

export type ShiyanSttRetryView = ShiyanStageRetryView & { stage: 'transcribe' };
export type ShiyanOrganizeRetryView = ShiyanStageRetryView & { stage: 'organize' };

export interface ShiyanCreateCaptureTaskInput {
  idempotencyKey: string;
  title: string;
  sceneId: string;
  audio: {
    contentType: string;
    sizeBytes?: number;
  };
}

export interface ShiyanCreateCaptureTaskResult {
  task: ShiyanCaptureTaskView;
  upload: ShiyanUploadGrant | null;
}

export interface ShiyanTaskResult {
  task: ShiyanCaptureTaskView;
}

export interface ShiyanTranscriptResult {
  transcript: ShiyanTranscriptView;
}

export interface ShiyanSceneSectionView {
  id: string;
  title: string;
  description: string;
}

export interface ShiyanSceneView {
  id: string;
  name: string;
  instruction: string;
  sections: ShiyanSceneSectionView[];
  builtIn: boolean;
}

export interface ShiyanSceneResult {
  scene: ShiyanSceneView;
}

export interface ShiyanScenesResult {
  scenes: ShiyanSceneView[];
}

export interface ShiyanAiDraftView {
  id: string;
  taskId: string;
  kind: 'ai';
  version: number;
  source: 'organize' | 'adjust';
  baseVersion: number | null;
  instruction: string | null;
  markdown: string;
  sceneId: string;
  createdAt: string;
}

export interface ShiyanFinalDraftView {
  id: string;
  taskId: string;
  kind: 'final';
  version: number;
  title: string;
  markdown: string;
  sceneId: string;
  baseVersion: number | null;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiyanAiDraftResult {
  draft: ShiyanAiDraftView;
}

export interface ShiyanFinalDraftResult {
  draft: ShiyanFinalDraftView;
}

export interface ShiyanDeliveryView {
  id: string;
  taskId: string;
  finalDraftId: string;
  idempotencyKey: string;
  destination: 'github';
  status: 'pending' | 'succeeded' | 'failed';
  retryable: boolean;
  retryCount: number;
  repository: string | null;
  path: string | null;
  commitSha: string | null;
  fileUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiyanDeliveriesResult {
  taskId: string;
  deliveries: ShiyanDeliveryView[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

export const isShiyanDeliveryView = (value: unknown): value is ShiyanDeliveryView => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.taskId === 'string' &&
    typeof value.finalDraftId === 'string' &&
    typeof value.idempotencyKey === 'string' &&
    value.idempotencyKey.length > 0 &&
    value.destination === 'github' &&
    (value.status === 'pending' || value.status === 'succeeded' || value.status === 'failed') &&
    typeof value.retryable === 'boolean' &&
    typeof value.retryCount === 'number' &&
    Number.isFinite(value.retryCount) &&
    value.retryCount >= 0 &&
    isNullableString(value.repository) &&
    isNullableString(value.path) &&
    isNullableString(value.commitSha) &&
    isNullableString(value.fileUrl) &&
    isNullableString(value.errorCode) &&
    isNullableString(value.errorMessage) &&
    isNullableString(value.deliveredAt) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

export const hasCanonicalGithubDeliveryEvidence = (
  delivery: ShiyanDeliveryView,
): boolean =>
  delivery.status === 'succeeded' &&
  Boolean(
    delivery.repository?.trim() &&
      delivery.path?.trim() &&
      delivery.commitSha?.trim() &&
      delivery.fileUrl?.trim() &&
      delivery.deliveredAt?.trim(),
  );

export const parseShiyanDeliveriesResult = (
  value: unknown,
  expectedTaskId?: string,
): ShiyanDeliveriesResult | null => {
  if (!isRecord(value) || typeof value.taskId !== 'string' || !Array.isArray(value.deliveries)) {
    return null;
  }
  if (expectedTaskId && value.taskId !== expectedTaskId) return null;
  if (!value.deliveries.every(isShiyanDeliveryView)) return null;
  if (value.deliveries.some((delivery) => delivery.taskId !== value.taskId)) return null;
  return {
    taskId: value.taskId,
    deliveries: value.deliveries,
  };
};

export interface ShiyanTaskContentView {
  aiDraftMarkdown: string | null;
  aiDraftVersion: number | null;
  finalDraftMarkdown: string | null;
  finalDraftBaseVersion: number | null;
  canonicalDestinationUrl: string | null;
}

export interface ShiyanAdjustmentCandidate {
  markdown: string;
  version: number;
  createdAt: string;
}
