import { loadShiyanRuntimeConfig, type ShiyanRuntimeConfig } from './runtimeConfig';
import type {
  ShiyanApiEnvelope,
  ShiyanAudioRetentionView,
  ShiyanCreateCaptureTaskInput,
  ShiyanCreateCaptureTaskResult,
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
  setAudioRetention(taskId: string, retained: boolean): Promise<ShiyanAudioRetentionView>;
  uploadLocalAudio(
    grant: ShiyanUploadGrant,
    filePath: string,
    onProgress?: (fraction: number) => void,
  ): Promise<void>;
  confirmAudio(taskId: string, assetId: string, idempotencyKey: string): Promise<ShiyanTaskResult>;
}

type ConfigLoader = () => Promise<ShiyanRuntimeConfig | null>;

const requestId = () =>
  `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeFileUri = (path: string) =>
  path.startsWith('file://') ? path : `file://${path}`;

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
      Object.entries(grant.headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable || event.total <= 0) return;
        onProgress(Math.max(0, Math.min(1, event.loaded / event.total)));
      };
      xhr.onerror = () =>
        reject(new ShiyanClientError('录音上传失败，请检查网络后重试。', 'upload_network_error', true));
      xhr.ontimeout = () =>
        reject(new ShiyanClientError('录音上传超时，可以直接重试。', 'upload_timeout', true));
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

    let envelope: ShiyanApiEnvelope<T>;
    try {
      envelope = (await response.json()) as ShiyanApiEnvelope<T>;
    } catch {
      throw new ShiyanClientError('拾言 Cloud 返回了无法识别的响应。', 'invalid_response', true);
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
