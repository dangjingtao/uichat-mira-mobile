import type { Session } from '../types';
import {
  MemoryLocalKeyValueStore,
  type LocalKeyValueStore,
} from '../storage/localKeyValueStore';
import {
  sortSessionsByLocalPin,
  splitSessionsByLocalPin,
  ThreadPinRepository,
  type ThreadPinMap,
} from './threadPinning';

const session = (id: string, updatedAt: string, title = id): Session => ({
  id,
  title,
  updatedAt: new Date(updatedAt),
});

class DelayedLocalKeyValueStore implements LocalKeyValueStore {
  private value: string | null = null;

  isAvailable() {
    return true;
  }

  async get() {
    return this.value;
  }

  async set(_key: string, value: string) {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 15));
    this.value = value;
  }

  async remove() {
    this.value = null;
  }
}

describe('ThreadPinRepository', () => {
  it('persists pins across repository instances', async () => {
    const storage = new MemoryLocalKeyValueStore();
    const first = new ThreadPinRepository(storage);
    const pins = { a: '2026-08-28T00:00:00.000Z' };

    await first.save(pins);

    const second = new ThreadPinRepository(storage);
    await expect(second.load()).resolves.toEqual(pins);
  });

  it('removes persisted state when no pins remain', async () => {
    const storage = new MemoryLocalKeyValueStore();
    const repository = new ThreadPinRepository(storage);

    await repository.save({ a: '2026-08-28T00:00:00.000Z' });
    await repository.save({});

    await expect(repository.load()).resolves.toEqual({});
  });

  it('serializes rapid writes so the latest pin state wins', async () => {
    const storage = new DelayedLocalKeyValueStore();
    const repository = new ThreadPinRepository(storage);

    const pin = repository.save({ a: '2026-08-28T00:00:00.000Z' });
    const unpin = repository.save({});
    await Promise.all([pin, unpin]);

    await expect(repository.load()).resolves.toEqual({});
  });

  it('ignores malformed persisted data', async () => {
    const storage = new MemoryLocalKeyValueStore();
    await storage.set('thread-pins-v1', '{"a":"not-a-date"}');

    await expect(new ThreadPinRepository(storage).load()).resolves.toEqual({});
  });
});

describe('local thread pin ordering', () => {
  it('puts pinned sessions first and keeps updatedAt descending within groups', () => {
    const sessions = [
      session('a', '2026-08-28T00:01:00.000Z'),
      session('b', '2026-08-28T00:04:00.000Z'),
      session('c', '2026-08-28T00:03:00.000Z'),
      session('d', '2026-08-28T00:02:00.000Z'),
    ];
    const pins: ThreadPinMap = {
      a: '2026-08-28T00:05:00.000Z',
      c: '2026-08-28T00:06:00.000Z',
    };

    expect(sortSessionsByLocalPin(sessions, pins).map(({ id }) => id)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
  });

  it('uses stable input order when updatedAt is equal', () => {
    const sessions = [
      session('a', '2026-08-28T00:01:00.000Z'),
      session('b', '2026-08-28T00:01:00.000Z'),
    ];

    expect(sortSessionsByLocalPin(sessions, {}).map(({ id }) => id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('keeps a pin when Host title or updatedAt changes', () => {
    const pins = { a: '2026-08-28T00:00:00.000Z' };
    const refreshed = [session('a', '2026-08-28T00:10:00.000Z', 'New title')];

    expect(sortSessionsByLocalPin(refreshed, pins)[0].id).toBe('a');
  });
});

describe('drawer session grouping', () => {
  it('separates pinned sessions into their own group before the recent cap', () => {
    const sessions = [
      session('a', '2026-08-28T00:10:00.000Z'),
      session('b', '2026-08-28T00:09:00.000Z'),
      session('c', '2026-08-28T00:08:00.000Z'),
      session('d', '2026-08-28T00:07:00.000Z'),
    ];
    const pins: ThreadPinMap = { c: '2026-08-28T00:00:00.000Z' };

    const groups = splitSessionsByLocalPin(sessions, pins, 2);

    expect(groups.pinned.map(({ id }) => id)).toEqual(['c']);
    expect(groups.recent.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('keeps an older pinned thread visible even beyond the recent cap', () => {
    const sessions = [
      session('a', '2026-08-28T00:10:00.000Z'),
      session('b', '2026-08-28T00:09:00.000Z'),
      session('c', '2026-08-28T00:08:00.000Z'),
      session('d', '2026-08-28T00:07:00.000Z'),
    ];
    const pins: ThreadPinMap = { d: '2026-08-28T00:00:00.000Z' };

    const groups = splitSessionsByLocalPin(sessions, pins, 2);

    expect(groups.pinned.map(({ id }) => id)).toEqual(['d']);
    expect(groups.recent.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('returns an empty pinned group when nothing is pinned', () => {
    const sessions = [
      session('a', '2026-08-28T00:10:00.000Z'),
      session('b', '2026-08-28T00:09:00.000Z'),
    ];

    const groups = splitSessionsByLocalPin(sessions, {}, 20);

    expect(groups.pinned).toEqual([]);
    expect(groups.recent.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('moves a thread back to recent after unpinning', () => {
    const sessions = [
      session('a', '2026-08-28T00:10:00.000Z'),
      session('b', '2026-08-28T00:09:00.000Z'),
    ];

    const pinned = splitSessionsByLocalPin(
      sessions,
      { b: '2026-08-28T00:00:00.000Z' },
      20,
    );
    const unpinned = splitSessionsByLocalPin(sessions, {}, 20);

    expect(pinned.pinned.map(({ id }) => id)).toEqual(['b']);
    expect(unpinned.pinned).toEqual([]);
    expect(unpinned.recent.map(({ id }) => id)).toEqual(['a', 'b']);
  });
});
