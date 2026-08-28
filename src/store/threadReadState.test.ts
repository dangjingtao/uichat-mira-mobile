import type { ChatMessage } from '../types';
import { MemoryLocalKeyValueStore } from '../storage/localKeyValueStore';
import {
  isThreadUnread,
  markThreadMessagesRead,
  needsThreadObservation,
  observeThreadMessages,
  ThreadReadRepository,
} from './threadReadState';

const message = (
  id: string,
  role: ChatMessage['role'],
  timestamp: string,
): ChatMessage => ({
  id,
  role,
  content: id,
  timestamp: new Date(timestamp),
});

describe('ThreadReadRepository', () => {
  it('persists read progress across repository instances', async () => {
    const storage = new MemoryLocalKeyValueStore();
    const first = new ThreadReadRepository(storage);
    const progress = {
      'thread-1': {
        lastReadMessageId: 'assistant-1',
        lastReadAt: '2026-08-28T01:00:00.000Z',
        latestContentMessageId: 'assistant-1',
        latestContentAt: '2026-08-28T01:00:00.000Z',
        observedMessageCount: 2,
      },
    };

    await first.save(progress);

    await expect(new ThreadReadRepository(storage).load()).resolves.toEqual(progress);
  });

  it('ignores malformed persisted progress', async () => {
    const storage = new MemoryLocalKeyValueStore();
    await storage.set(
      'thread-read-progress-v1',
      JSON.stringify({ 'thread-1': { observedMessageCount: -1 } }),
    );

    await expect(new ThreadReadRepository(storage).load()).resolves.toEqual({});
  });
});

describe('device-local unread semantics', () => {
  const firstHistory = [
    message('user-1', 'user', '2026-08-28T01:00:00.000Z'),
    message('assistant-1', 'assistant', '2026-08-28T01:00:01.000Z'),
  ];

  it('treats observed user/assistant content as unread before this device reads it', () => {
    const observed = observeThreadMessages(undefined, firstHistory, 2);
    expect(isThreadUnread(observed)).toBe(true);
  });

  it('clears unread only after the canonical messages are marked read', () => {
    const observed = observeThreadMessages(undefined, firstHistory, 2);
    const read = markThreadMessagesRead(observed, firstHistory, 2);

    expect(read.lastReadMessageId).toBe('assistant-1');
    expect(isThreadUnread(read)).toBe(false);
  });

  it('becomes unread when a newer assistant message is observed', () => {
    const read = markThreadMessagesRead(undefined, firstHistory, 2);
    const refreshed = observeThreadMessages(
      read,
      [
        ...firstHistory,
        message('assistant-2', 'assistant', '2026-08-28T01:00:02.000Z'),
      ],
      3,
    );

    expect(refreshed.lastReadMessageId).toBe('assistant-1');
    expect(refreshed.latestContentMessageId).toBe('assistant-2');
    expect(isThreadUnread(refreshed)).toBe(true);
  });

  it('does not invent unread for newer system/tool-derived messages', () => {
    const read = markThreadMessagesRead(undefined, firstHistory, 2);
    const refreshed = observeThreadMessages(
      read,
      [
        ...firstHistory,
        message('system-1', 'system', '2026-08-28T01:00:02.000Z'),
      ],
      3,
    );

    expect(refreshed.latestContentMessageId).toBe('assistant-1');
    expect(isThreadUnread(refreshed)).toBe(false);
  });

  it('keeps multiple thread progress values independent', () => {
    const threadA = markThreadMessagesRead(undefined, firstHistory, 2);
    const threadB = observeThreadMessages(
      undefined,
      [message('assistant-b', 'assistant', '2026-08-28T02:00:00.000Z')],
      1,
    );

    expect(isThreadUnread(threadA)).toBe(false);
    expect(isThreadUnread(threadB)).toBe(true);
  });

  it('uses messageCount only as a change probe', () => {
    const read = markThreadMessagesRead(undefined, firstHistory, 2);

    expect(needsThreadObservation(read, 2)).toBe(false);
    expect(needsThreadObservation(read, 3)).toBe(true);
    expect(needsThreadObservation(read, undefined)).toBe(false);
  });
});
