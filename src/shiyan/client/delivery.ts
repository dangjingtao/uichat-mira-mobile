import { loadShiyanRuntimeConfig } from './runtimeConfig';
import {
  parseShiyanApiEnvelope,
  ShiyanClientError,
} from './ShiyanClient';
import type {
  ShiyanApiEnvelope,
  ShiyanDeliveryView,
  ShiyanFinalDraftView,
} from './contracts';

export interface ShiyanGithubDeliveryResult {
  taskId: string;
  record: ShiyanDeliveryView;
  delivery: {
    destination: 'github';
    repository: string;
    path: string;
    commitSha: string;
    fileUrl: string;
    deliveredAt: string;
  };
}

const requestId = () =>
  `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const githubDeliveryIdempotencyKey = (
  taskId: string,
  finalDraft: Pick<ShiyanFinalDraftView, 'confirmedAt'>,
): string => `mobile-github:${taskId}:${finalDraft.confirmedAt}`;

export async function deliverFinalDraftToGithub(
  taskId: string,
  finalDraft: Pick<ShiyanFinalDraftView, 'confirmedAt'>,
): Promise<ShiyanGithubDeliveryResult> {
  const config = await loadShiyanRuntimeConfig();
  if (!config) {
    throw new ShiyanClientError(
      '拾言 Cloud 尚未配置设备凭证。',
      'shiyan_not_configured',
      false,
      taskId,
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `${config.baseUrl}/v1/capture-tasks/${encodeURIComponent(taskId)}/deliveries`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.credential}`,
          'X-Request-Id': requestId(),
        },
        body: JSON.stringify({
          destination: 'github',
          idempotencyKey: githubDeliveryIdempotencyKey(taskId, finalDraft),
        }),
      },
    );
  } catch {
    throw new ShiyanClientError(
      '无法连接拾言 Cloud，Final Draft 仍已安全保存，可以稍后重试投递。',
      'network_error',
      true,
      taskId,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ShiyanClientError(
      '拾言 Cloud 返回了无法识别的投递响应。',
      'invalid_response',
      true,
      taskId,
    );
  }

  const envelope = parseShiyanApiEnvelope<ShiyanGithubDeliveryResult>(raw) as
    | ShiyanApiEnvelope<ShiyanGithubDeliveryResult>
    | null;
  if (!envelope) {
    throw new ShiyanClientError(
      '拾言 Cloud 返回了不完整的投递响应。',
      'invalid_response',
      true,
      taskId,
    );
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
