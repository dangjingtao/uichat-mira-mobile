import type { Session } from '../types';
import { MemoryLocalKeyValueStore } from '../storage/localKeyValueStore';
import {
  pruneThreadPins,
  sortSessionsByLocalPin,
  ThreadPinRepository,
  type ThreadPinMap,
} from './threadPinning';

const session = (id: string, updatedAt: string, title = id): Session => ({
  id,
  title,
  updatedAt: new Date(updatedAt),
});

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

  it('prunes pins for threads absent from the authoritative list', () => {
    const pins = {
      a: '2026-08-28T00:00:00.000Z',
      deleted: '2026-08-28T00:01:00.000Z',
    };

    expect(pruneThreadPins(pins, ['a', 'b'])).toEqual({
      a: '2026-08-28T00:00:00.000Z',
    });
  });
});
