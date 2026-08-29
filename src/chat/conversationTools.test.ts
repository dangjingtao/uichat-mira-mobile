import type { ChatMessage } from '../types';
import {
  buildConversationShareText,
  findConversationMatches,
  nextConversationMatchIndex,
} from './conversationTools';

const messages: ChatMessage[] = [
  {
    id: 'user-1',
    role: 'user',
    content: 'Hello Mira',
    timestamp: new Date('2026-08-29T00:00:00.000Z'),
    metadata: { internal: 'do-not-share' },
  },
  {
    id: 'assistant-1',
    role: 'assistant',
    content: '你好，HELLO',
    timestamp: new Date('2026-08-29T00:00:01.000Z'),
    metadata: { agent: { runId: 'run-secret' } },
  },
  {
    id: 'system-1',
    role: 'system',
    content: 'hidden tool/system content',
    timestamp: new Date('2026-08-29T00:00:02.000Z'),
    metadata: { credential: 'Bearer secret' },
  },
];

describe('conversationTools', () => {
  test('builds share text from user-visible content only', () => {
    const text = buildConversationShareText(messages, 'Current chat');

    expect(text).toContain('Current chat');
    expect(text).toContain('You: Hello Mira');
    expect(text).toContain('Mira: 你好，HELLO');
    expect(text).not.toContain('hidden tool/system content');
    expect(text).not.toContain('run-secret');
    expect(text).not.toContain('Bearer secret');
  });

  test('finds current-thread visible text case-insensitively', () => {
    expect(findConversationMatches(messages, 'hello')).toEqual([
      { messageId: 'user-1', messageIndex: 0 },
      { messageId: 'assistant-1', messageIndex: 1 },
    ]);
    expect(findConversationMatches(messages, '你好')).toEqual([
      { messageId: 'assistant-1', messageIndex: 1 },
    ]);
    expect(findConversationMatches(messages, 'hidden')).toEqual([]);
    expect(findConversationMatches(messages, 'missing')).toEqual([]);
  });

  test('cycles next and previous match positions deterministically', () => {
    expect(nextConversationMatchIndex(-1, 3, 'next')).toBe(0);
    expect(nextConversationMatchIndex(-1, 3, 'previous')).toBe(2);
    expect(nextConversationMatchIndex(2, 3, 'next')).toBe(0);
    expect(nextConversationMatchIndex(0, 3, 'previous')).toBe(2);
    expect(nextConversationMatchIndex(0, 0, 'next')).toBe(-1);
  });
});
