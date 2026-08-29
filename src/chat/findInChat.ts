import type { ChatMessage } from '../types';

export interface ChatSearchMatch {
  messageId: string;
  messageIndex: number;
  occurrences: number;
}

/**
 * Only user-visible text is searchable. Hidden system/tool content must never
 * surface as search results, matching what the chat UI renders.
 */
function isSearchableMessage(message: ChatMessage): boolean {
  return message.role === 'user' || message.role === 'assistant';
}

/**
 * toLowerCase covers Latin case folding; CJK text has no case so it matches
 * as-is, keeping Chinese and English queries on the same code path.
 */
export function countOccurrences(haystack: string, query: string): number {
  if (query.length === 0) return 0;
  const foldedHaystack = haystack.toLowerCase();
  const foldedQuery = query.toLowerCase();
  let count = 0;
  let fromIndex = foldedHaystack.indexOf(foldedQuery);
  while (fromIndex !== -1) {
    count += 1;
    fromIndex = foldedHaystack.indexOf(foldedQuery, fromIndex + foldedQuery.length);
  }
  return count;
}

export function findMatchesInChat(
  messages: ChatMessage[],
  query: string,
): ChatSearchMatch[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return [];
  const matches: ChatSearchMatch[] = [];
  messages.forEach((message, messageIndex) => {
    if (!isSearchableMessage(message)) return;
    const occurrences = countOccurrences(message.content, trimmedQuery);
    if (occurrences > 0) {
      matches.push({ messageId: message.id, messageIndex, occurrences });
    }
  });
  return matches;
}

export function stepMatchIndex(
  current: number,
  delta: 1 | -1,
  total: number,
): number {
  if (total <= 0) return 0;
  return (((current + delta) % total) + total) % total;
}

export function clampMatchIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  if (current < 0) return 0;
  return Math.min(current, total - 1);
}
