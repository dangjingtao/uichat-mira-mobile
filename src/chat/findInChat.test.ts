import type { ChatMessage } from '../types';
import {
  clampMatchIndex,
  countOccurrences,
  findMatchesInChat,
  stepMatchIndex,
} from './findInChat';

const message = (
  id: string,
  role: ChatMessage['role'],
  content: string,
): ChatMessage => ({
  id,
  role,
  content,
  timestamp: new Date('2026-08-29T01:00:00.000Z'),
});

describe('findMatchesInChat', () => {
  const history = [
    message('u1', 'user', 'hello world'),
    message('a1', 'assistant', 'Hello again, hello Mira'),
    message('s1', 'system', 'hidden hello system note'),
    message('u2', 'user', '完全不相关'),
  ];

  it('returns no matches for an empty or blank query', () => {
    expect(findMatchesInChat(history, '')).toEqual([]);
    expect(findMatchesInChat(history, '   ')).toEqual([]);
  });

  it('returns no matches when nothing contains the query', () => {
    expect(findMatchesInChat(history, 'xyz')).toEqual([]);
  });

  it('matches case-insensitively across messages with occurrence counts', () => {
    const matches = findMatchesInChat(history, 'HELLO');

    expect(matches).toEqual([
      { messageId: 'u1', messageIndex: 0, occurrences: 1 },
      { messageId: 'a1', messageIndex: 1, occurrences: 2 },
    ]);
  });

  it('matches Chinese text', () => {
    const matches = findMatchesInChat(
      [message('u1', 'user', '今天天气不错'), message('a1', 'assistant', '是啊')],
      '天气',
    );

    expect(matches).toEqual([
      { messageId: 'u1', messageIndex: 0, occurrences: 1 },
    ]);
  });

  it('never exposes hidden system/tool messages as results', () => {
    const matches = findMatchesInChat(history, 'hello');

    expect(matches.some((match) => match.messageId === 's1')).toBe(false);
  });

  it('finds a single match', () => {
    const matches = findMatchesInChat(history, 'world');

    expect(matches).toHaveLength(1);
    expect(matches[0].messageId).toBe('u1');
  });
});

describe('countOccurrences', () => {
  it('counts non-overlapping occurrences case-insensitively', () => {
    expect(countOccurrences('Aba aba ABA', 'aBa')).toBe(3);
    expect(countOccurrences('abc', '')).toBe(0);
    expect(countOccurrences('abc', 'd')).toBe(0);
  });
});

describe('stepMatchIndex', () => {
  it('cycles forward and backward across boundaries', () => {
    expect(stepMatchIndex(2, 1, 3)).toBe(0);
    expect(stepMatchIndex(0, -1, 3)).toBe(2);
    expect(stepMatchIndex(0, 1, 3)).toBe(1);
    expect(stepMatchIndex(1, -1, 3)).toBe(0);
  });

  it('stays at 0 when there are no matches', () => {
    expect(stepMatchIndex(0, 1, 0)).toBe(0);
    expect(stepMatchIndex(0, -1, 0)).toBe(0);
  });
});

describe('clampMatchIndex', () => {
  it('keeps the current index inside a shrinking match list', () => {
    expect(clampMatchIndex(4, 3)).toBe(2);
    expect(clampMatchIndex(1, 3)).toBe(1);
    expect(clampMatchIndex(0, 0)).toBe(0);
    expect(clampMatchIndex(-2, 3)).toBe(0);
  });
});
