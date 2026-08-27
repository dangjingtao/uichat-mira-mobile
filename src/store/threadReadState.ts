import type { ChatMessage } from '../types';
import type { LocalKeyValueStore } from '../storage/localKeyValueStore';

export interface ThreadReadProgress {
  lastReadMessageId?: string;
  lastReadAt?: string;
  latestContentMessageId?: string;
  latestContentAt?: string;
  observedMessageCount: number;
}

export type ThreadReadMap = Record<string, ThreadReadProgress>;

const STORAGE_KEY = 'thread-read-progress-v1';

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !Number.isNaN(Date.parse(value));

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || (typeof value === 'string' && value.trim().length > 0);

const isOptionalIsoDate = (value: unknown): value is string | undefined =>
  value === undefined || isIsoDate(value);

const isValidProgress = (value: unknown): value is ThreadReadProgress => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Number.isInteger(record.observedMessageCount) &&
    (record.observedMessageCount as number) >= 0 &&
    isOptionalString(record.lastReadMessageId) &&
    isOptionalIsoDate(record.lastReadAt) &&
    isOptionalString(record.latestContentMessageId) &&
    isOptionalIsoDate(record.latestContentAt)
  );
};

const isValidReadMap = (value: unknown): value is ThreadReadMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([threadId, progress]) => threadId.trim().length > 0 && isValidProgress(progress),
  );
};

export class ThreadReadRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: LocalKeyValueStore) {}

  async load(): Promise<ThreadReadMap> {
    const value = await this.storage.get(STORAGE_KEY);
    if (!value) return {};

    try {
      const parsed = JSON.parse(value) as unknown;
      return isValidReadMap(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  save(progress: ThreadReadMap): Promise<void> {
    const snapshot = JSON.parse(JSON.stringify(progress)) as ThreadReadMap;
    const operation = this.writeQueue.then(async () => {
      if (Object.keys(snapshot).length === 0) {
        await this.storage.remove(STORAGE_KEY);
        return;
      }
      await this.storage.set(STORAGE_KEY, JSON.stringify(snapshot));
    });
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }
}

const getLatestContentMessage = (messages: ChatMessage[]): ChatMessage | null => {
  let latest: ChatMessage | null = null;
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    if (!latest || message.timestamp.getTime() >= latest.timestamp.getTime()) {
      latest = message;
    }
  }
  return latest;
};

export const observeThreadMessages = (
  current: ThreadReadProgress | undefined,
  messages: ChatMessage[],
  observedMessageCount: number,
): ThreadReadProgress => {
  const latest = getLatestContentMessage(messages);
  return {
    ...(current?.lastReadMessageId
      ? { lastReadMessageId: current.lastReadMessageId }
      : {}),
    ...(current?.lastReadAt ? { lastReadAt: current.lastReadAt } : {}),
    ...(latest
      ? {
          latestContentMessageId: latest.id,
          latestContentAt: latest.timestamp.toISOString(),
        }
      : {}),
    observedMessageCount: Math.max(0, observedMessageCount),
  };
};

export const markThreadMessagesRead = (
  current: ThreadReadProgress | undefined,
  messages: ChatMessage[],
  observedMessageCount: number,
): ThreadReadProgress => {
  const observed = observeThreadMessages(current, messages, observedMessageCount);
  if (!observed.latestContentMessageId || !observed.latestContentAt) {
    return { observedMessageCount: observed.observedMessageCount };
  }
  return {
    ...observed,
    lastReadMessageId: observed.latestContentMessageId,
    lastReadAt: observed.latestContentAt,
  };
};

export const isThreadUnread = (progress: ThreadReadProgress | undefined): boolean => {
  if (!progress?.latestContentMessageId || !progress.latestContentAt) return false;
  if (!progress.lastReadMessageId || !progress.lastReadAt) return true;
  if (progress.latestContentMessageId === progress.lastReadMessageId) return false;

  const latestAt = Date.parse(progress.latestContentAt);
  const readAt = Date.parse(progress.lastReadAt);
  if (!Number.isNaN(latestAt) && !Number.isNaN(readAt)) {
    return latestAt >= readAt;
  }
  return true;
};

export const needsThreadObservation = (
  progress: ThreadReadProgress | undefined,
  messageCount: number | undefined,
): boolean => {
  if (!Number.isInteger(messageCount) || (messageCount as number) < 0) return false;
  return !progress || progress.observedMessageCount !== messageCount;
};
