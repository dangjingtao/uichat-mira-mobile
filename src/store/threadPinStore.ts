import { create } from 'zustand';
import { localKeyValueStore } from '../storage/localKeyValueStore';
import {
  isThreadPinned,
  pruneThreadPins,
  ThreadPinRepository,
  type ThreadPinMap,
} from './threadPinning';

const repository = new ThreadPinRepository(localKeyValueStore);
let hydratePromise: Promise<void> | null = null;

interface ThreadPinStore {
  pinnedAtByThreadId: ThreadPinMap;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  pinThread: (threadId: string) => Promise<void>;
  unpinThread: (threadId: string) => Promise<void>;
  pruneToThreadIds: (threadIds: Iterable<string>) => Promise<void>;
}

export const useThreadPinStore = create<ThreadPinStore>((set, get) => ({
  pinnedAtByThreadId: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    if (!hydratePromise) {
      hydratePromise = repository
        .load()
        .then((pinnedAtByThreadId) => {
          set({ pinnedAtByThreadId, hydrated: true });
        })
        .finally(() => {
          hydratePromise = null;
        });
    }
    await hydratePromise;
  },

  pinThread: async (threadId) => {
    if (!threadId.trim()) return;
    await get().hydrate();
    const previous = get().pinnedAtByThreadId;
    if (isThreadPinned(previous, threadId)) return;

    const next: ThreadPinMap = {
      ...previous,
      [threadId]: new Date().toISOString(),
    };
    set({ pinnedAtByThreadId: next });
    try {
      await repository.save(next);
    } catch (error) {
      if (get().pinnedAtByThreadId === next) {
        set({ pinnedAtByThreadId: previous });
      }
      throw error;
    }
  },

  unpinThread: async (threadId) => {
    await get().hydrate();
    const previous = get().pinnedAtByThreadId;
    if (!isThreadPinned(previous, threadId)) return;

    const next = { ...previous };
    delete next[threadId];
    set({ pinnedAtByThreadId: next });
    try {
      await repository.save(next);
    } catch (error) {
      if (get().pinnedAtByThreadId === next) {
        set({ pinnedAtByThreadId: previous });
      }
      throw error;
    }
  },

  pruneToThreadIds: async (threadIds) => {
    await get().hydrate();
    const previous = get().pinnedAtByThreadId;
    const next = pruneThreadPins(previous, threadIds);
    if (Object.keys(next).length === Object.keys(previous).length) return;

    set({ pinnedAtByThreadId: next });
    try {
      await repository.save(next);
    } catch (error) {
      if (get().pinnedAtByThreadId === next) {
        set({ pinnedAtByThreadId: previous });
      }
      throw error;
    }
  },
}));
