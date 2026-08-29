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

export interface ShiyanSttRetryView {
  taskId: string;
  stage: 'transcribe';
  retryCount: number;
}

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

/**
 * MOB-020 owns the concrete Cloud persistence/HTTP contract for AI Draft and
 * Final Draft. MOB-021 consumes this domain shape only; it deliberately does
 * not invent endpoint paths before that Cloud contract exists.
 */
export interface ShiyanTaskContentView {
  aiDraftMarkdown: string | null;
  finalDraftMarkdown: string | null;
  canonicalDestinationUrl: string | null;
}

export interface ShiyanAdjustmentCandidate {
  markdown: string;
  createdAt: string;
}
