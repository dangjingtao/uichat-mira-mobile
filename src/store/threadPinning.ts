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
  private writeQueue: Promise<void> = Promise.resolve();

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

  save(pins: ThreadPinMap): Promise<void> {
    const snapshot = { ...pins };
    const operation = this.writeQueue.then(async () => {
      if (Object.keys(snapshot).length === 0) {
        await this.storage.remove(STORAGE_KEY);
        return;
      }
      await this.storage.set(STORAGE_KEY, JSON.stringify(snapshot));
    });

    // Keep later writes ordered even when one persistence operation fails.
    this.writeQueue = operation.catch(() => undefined);
    return operation;
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

export interface DrawerSessionGroups {
  pinned: Session[];
  recent: Session[];
}

/**
 * Split sessions into the drawer's pinned and recent groups.
 *
 * Grouping happens before the recent display cap so an older-but-pinned
 * thread never disappears from the drawer just because it falls outside the
 * recent limit.
 */
export const splitSessionsByLocalPin = (
  sessions: Session[],
  pins: ThreadPinMap,
  recentLimit: number,
): DrawerSessionGroups => {
  const pinned: Session[] = [];
  const recent: Session[] = [];
  for (const session of sortSessionsByLocalPin(sessions, pins)) {
    if (isThreadPinned(pins, session.id)) {
      pinned.push(session);
    } else if (recent.length < recentLimit) {
      recent.push(session);
    }
  }
  return { pinned, recent };
};
