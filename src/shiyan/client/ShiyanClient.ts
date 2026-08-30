import { loadShiyanRuntimeConfig, type ShiyanRuntimeConfig } from './runtimeConfig';
import type {
  ShiyanAiDraftResult,
  ShiyanApiEnvelope,
  ShiyanAudioRetentionView,
  ShiyanCreateCaptureTaskInput,
  ShiyanCreateCaptureTaskResult,
  ShiyanDeliveriesResult,
  ShiyanFinalDraftResult,
  ShiyanOrganizeRetryView,
  ShiyanSceneResult,
  ShiyanScenesResult,
  ShiyanSttRetryView,
  ShiyanTaskResult,
  ShiyanTranscriptResult,
  ShiyanUploadGrant,
} from './contracts';

export class ShiyanClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
    readonly taskId?: string,
  ) {
    super(message);
    this.name = 'ShiyanClientError';
  }
}

export interface ShiyanCloudClient {
  createCaptureTask(input: ShiyanCreateCaptureTaskInput): Promise<ShiyanCreateCaptureTaskResult>;
  getCaptureTask(taskId: string): Promise<ShiyanTaskResult>;
  getTranscript(taskId: string): Promise<ShiyanTranscriptResult>;
  retryStt(taskId: string): Promise<ShiyanSttRetryView>;
  retryOrganize(taskId: string): Promise<ShiyanOrganizeRetryView>;
  getAiDraft(taskId: string): Promise<ShiyanAiDraftResult>;
  adjustAiDraft(taskId: string, instruction: string, idempotencyKey: string): Promise<ShiyanAiDraftResult>;
  getFinalDraft(taskId: string): Promise<ShiyanFinalDraftResult>;
  saveFinalDraft(
    taskId: string,
    input: { markdown: string; title?: string; baseVersion?: number },
  ): Promise<ShiyanFinalDraftResult>;
  listScenes(): Promise<ShiyanScenesResult>;
  createScene(input: {
    id: string;
    name: string;
    instruction: string;
    sections: Array<{ id: string; title: string; description: string }>;
  }): Promise<ShiyanSceneResult>;
  getDeliveries(taskId: string): Promise<ShiyanDeliveriesResult>;
  setAudioRetention(taskId: string, retained: boolean): Promise<ShiyanAudioRetentionView>;
  uploadLocalAudio(
    grant: ShiyanUploadGrant,
    filePath: string,
    onProgress?: (fraction: number) => void,
  ): Promise<void>;
  confirmAudio(taskId: string, assetId: string, idempotencyKey: string): Promise<ShiyanTaskResult>;
}

type ConfigLoader = () => Promise<ShiyanRuntimeConfig | null>;

const UPLOAD_TIMEOUT_MS = 12 * 60 * 1000;

const requestId = () =>
  `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeFileUri = (path: string) =>
  path.startsWith('file://') ? path : `file://${path}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseShiyanApiEnvelope<T>(value: unknown): ShiyanApiEnvelope<T> | null {
  if (!isRecord(value) || typeof value.ok !== 'boolean' || typeof value.requestId !== 'string') {
    return null;
  }

  if (value.ok === true) {
    if (!Object.prototype.hasOwnProperty.call(value, 'data')) return null;
    return value as unknown as ShiyanApiEnvelope<T>;
  }

  if (!isRecord(value.error)) return null;
  if (
    typeof value.error.code !== 'string' ||
    typeof value.error.message !== 'string' ||
    typeof value.error.retryable !== 'boolean' ||
    (value.taskId !== undefined && typeof value.taskId !== 'string')
  ) {
    return null;
  }
  return value as unknown as ShiyanApiEnvelope<T>;
}

export class HttpShiyanClient implements ShiyanCloudClient {
  constructor(private readonly loadConfig: ConfigLoader = loadShiyanRuntimeConfig) {}

  async createCaptureTask(input: ShiyanCreateCaptureTaskInput) {
    return this.request<ShiyanCreateCaptureTaskResult>('/v1/capture-tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getCaptureTask(taskId: string) {
    return this.request<ShiyanTaskResult>(`/v1/capture-tasks/${encodeURIComponent(taskId)}`);
  }

  async getTranscript(taskId: string) {
    return this.request<ShiyanTranscriptResult>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/transcript`,
    );
  }

  async retryStt(taskId: string) {
    return this.request<ShiyanSttRetryView>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/stt/retry`,
      { method: 'POST' },
    );
  }

  async retryOrganize(taskId: string) {
    return this.request<ShiyanOrganizeRetryView>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/organize/retry`,
      { method: 'POST' },
    );
  }

  async getAiDraft(taskId: string) {
    return this.request<ShiyanAiDraftResult>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/ai-draft`,
    );
  }

  async adjustAiDraft(taskId: string, instruction: string, idempotencyKey: string) {
    return this.request<ShiyanAiDraftResult>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/ai-draft/adjust`,
      {
        method: 'POST',
        body: JSON.stringify({ instruction, idempotencyKey }),
      },
    );
  }

  async getFinalDraft(taskId: string) {
    return this.request<ShiyanFinalDraftResult>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/final-draft`,
    );
  }

  async saveFinalDraft(
    taskId: string,
    input: { markdown: string; title?: string; baseVersion?: number },
  ) {
    return this.request<ShiyanFinalDraftResult>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/final-draft`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
    );
  }

  async listScenes() {
    return this.request<ShiyanScenesResult>('/v1/scenes');
  }

  async createScene(input: {
    id: string;
    name: string;
    instruction: string;
    sections: Array<{ id: string; title: string; description: string }>;
  }) {
    return this.request<ShiyanSceneResult>('/v1/scenes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getDeliveries(taskId: string) {
    return this.request<ShiyanDeliveriesResult>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/deliveries`,
    );
  }

  async setAudioRetention(taskId: string, retained: boolean) {
    return this.request<ShiyanAudioRetentionView>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/audio/retention`,
      { method: 'PUT', body: JSON.stringify({ retained }) },
    );
  }

  async confirmAudio(taskId: string, assetId: string, idempotencyKey: string) {
    return this.request<ShiyanTaskResult>(
      `/v1/capture-tasks/${encodeURIComponent(taskId)}/audio/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ assetId, idempotencyKey }),
      },
    );
  }

  async uploadLocalAudio(
    grant: ShiyanUploadGrant,
    filePath: string,
    onProgress?: (fraction: number) => void,
  ): Promise<void> {
    let blob: Blob;
    try {
      const localResponse = await fetch(normalizeFileUri(filePath));
      if (!localResponse.ok) throw new Error(`local file status ${localResponse.status}`);
      blob = await localResponse.blob();
    } catch {
      throw new ShiyanClientError('无法读取本地录音文件。', 'local_audio_unreadable', false);
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', grant.url);
      xhr.timeout = UPLOAD_TIMEOUT_MS;
      Object.entries(grant.headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable || event.total <= 0) return;
        onProgress(Math.max(0, Math.min(1, event.loaded / event.total)));
      };
      xhr.onerror = () =>
        reject(new ShiyanClientError('录音上传失败，请检查网络后重试。', 'upload_network_error', true));
      xhr.ontimeout = () => {
        xhr.abort();
        reject(new ShiyanClientError('录音上传超时，可以直接重试。', 'upload_timeout', true));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(1);
          resolve();
          return;
        }
        reject(
          new ShiyanClientError(
            '录音上传未被存储服务接受，可以重新获取授权后重试。',
            'upload_rejected',
            xhr.status >= 500 || xhr.status === 408 || xhr.status === 429,
          ),
        );
      };
      xhr.send(blob);
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const config = await this.loadConfig();
    if (!config) {
      throw new ShiyanClientError(
        '拾言 Cloud 尚未配置设备凭证。录音仍安全保存在本机。',
        'shiyan_not_configured',
        false,
      );
    }

    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.credential}`,
          'X-Request-Id': requestId(),
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new ShiyanClientError('无法连接拾言 Cloud，请稍后重试。', 'network_error', true);
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ShiyanClientError('拾言 Cloud 返回了无法识别的响应。', 'invalid_response', true);
    }

    const envelope = parseShiyanApiEnvelope<T>(raw);
    if (!envelope) {
      throw new ShiyanClientError('拾言 Cloud 返回了不完整的响应。', 'invalid_response', true);
    }
    if (!envelope.ok) {
      throw new ShiyanClientError(
        envelope.error.message,
        envelope.error.code,
        envelope.error.retryable,
        envelope.taskId,
      );
    }
    return envelope.data;
  }
}

export const shiyanClient = new HttpShiyanClient();
