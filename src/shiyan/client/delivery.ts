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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isDeliveryView = (value: unknown): value is ShiyanDeliveryView => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.taskId === 'string' &&
    typeof value.finalDraftId === 'string' &&
    value.destination === 'github' &&
    (value.status === 'pending' || value.status === 'succeeded' || value.status === 'failed') &&
    typeof value.retryable === 'boolean' &&
    typeof value.retryCount === 'number' &&
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

const parseGithubDeliveryResult = (
  value: unknown,
  taskId: string,
  finalDraftId: string,
): ShiyanGithubDeliveryResult | null => {
  if (!isRecord(value) || value.taskId !== taskId || !isDeliveryView(value.record)) {
    return null;
  }
  const delivery = value.delivery;
  if (!isRecord(delivery)) return null;
  if (
    value.record.taskId !== taskId ||
    value.record.finalDraftId !== finalDraftId ||
    value.record.status !== 'succeeded' ||
    delivery.destination !== 'github' ||
    typeof delivery.repository !== 'string' ||
    typeof delivery.path !== 'string' ||
    typeof delivery.commitSha !== 'string' ||
    typeof delivery.fileUrl !== 'string' ||
    typeof delivery.deliveredAt !== 'string' ||
    !delivery.repository ||
    !delivery.path ||
    !delivery.commitSha ||
    !delivery.fileUrl ||
    !delivery.deliveredAt
  ) {
    return null;
  }
  return {
    taskId,
    record: value.record,
    delivery: {
      destination: 'github',
      repository: delivery.repository,
      path: delivery.path,
      commitSha: delivery.commitSha,
      fileUrl: delivery.fileUrl,
      deliveredAt: delivery.deliveredAt,
    },
  };
};

export const githubDeliveryIdempotencyKey = (
  taskId: string,
  finalDraft: Pick<ShiyanFinalDraftView, 'id' | 'confirmedAt'>,
): string => `mobile-github:${taskId}:${finalDraft.id}:${finalDraft.confirmedAt}`;

export async function deliverFinalDraftToGithub(
  taskId: string,
  finalDraft: Pick<ShiyanFinalDraftView, 'id' | 'confirmedAt'>,
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

  const envelope = parseShiyanApiEnvelope<unknown>(raw) as
    | ShiyanApiEnvelope<unknown>
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

  const result = parseGithubDeliveryResult(envelope.data, taskId, finalDraft.id);
  if (!result) {
    throw new ShiyanClientError(
      '拾言 Cloud 返回的 GitHub 投递证据不完整或不属于当前 Final Draft。',
      'invalid_response',
      true,
      taskId,
    );
  }
  return result;
}
