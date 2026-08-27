import type { Session } from '../types';
import type { LocalKeyValueStore } from '../storage/localKeyValueStore';

export type ThreadPinMap = Record<string, string>;

const STORAGE_KEY = 'thread-pins-v1';

const isValidPinMap = (value: unknown): value is ThreadPinMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([threadId, pinnedAt]) =>
      threadId.trim().length > 0 &&
      typeof pinnedAt === 'string' &&
      pinnedAt.trim().length > 0 &&
      !Number.isNaN(Date.parse(pinnedAt)),
  );
};

export class ThreadPinRepository {
  constructor(private readonly storage: LocalKeyValueStore) {}

  async load(): Promise<ThreadPinMap> {
    const value = await this.storage.get(STORAGE_KEY);
    if (!value) return {};

    try {
      const parsed = JSON.parse(value) as unknown;
      return isValidPinMap(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  async save(pins: ThreadPinMap): Promise<void> {
    if (Object.keys(pins).length === 0) {
      await this.storage.remove(STORAGE_KEY);
      return;
    }
    await this.storage.set(STORAGE_KEY, JSON.stringify(pins));
  }
}

export const isThreadPinned = (pins: ThreadPinMap, threadId: string): boolean =>
  Object.prototype.hasOwnProperty.call(pins, threadId);

export const sortSessionsByLocalPin = (
  sessions: Session[],
  pins: ThreadPinMap,
): Session[] =>
  sessions
    .map((session, index) => ({ session, index }))
    .sort((left, right) => {
      const leftPinned = isThreadPinned(pins, left.session.id);
      const rightPinned = isThreadPinned(pins, right.session.id);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

      const updatedDiff =
        right.session.updatedAt.getTime() - left.session.updatedAt.getTime();
      if (updatedDiff !== 0) return updatedDiff;
      return left.index - right.index;
    })
    .map(({ session }) => session);

export const pruneThreadPins = (
  pins: ThreadPinMap,
  validThreadIds: Iterable<string>,
): ThreadPinMap => {
  const validIds = new Set(validThreadIds);
  return Object.fromEntries(
    Object.entries(pins).filter(([threadId]) => validIds.has(threadId)),
  );
};
