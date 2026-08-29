import type { ChatMessage } from '../types';

const userVisibleMessages = (messages: ChatMessage[]) =>
  messages.filter(
    (message) =>
      (message.role === 'user' || message.role === 'assistant') &&
      message.content.trim().length > 0,
  );

export const buildConversationShareText = (
  messages: ChatMessage[],
  title?: string,
): string => {
  const body = userVisibleMessages(messages)
    .map((message) => `${message.role === 'user' ? 'You' : 'Mira'}: ${message.content.trim()}`)
    .join('\n\n');

  const safeTitle = title?.trim();
  if (!safeTitle) return body;
  return body ? `${safeTitle}\n\n${body}` : safeTitle;
};

export type ConversationMatch = {
  messageId: string;
  messageIndex: number;
};

export const findConversationMatches = (
  messages: ChatMessage[],
  query: string,
): ConversationMatch[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const matches: ConversationMatch[] = [];
  messages.forEach((message, messageIndex) => {
    if (message.role !== 'user' && message.role !== 'assistant') return;
    if (message.content.toLocaleLowerCase().includes(normalizedQuery)) {
      matches.push({ messageId: message.id, messageIndex });
    }
  });
  return matches;
};

export const nextConversationMatchIndex = (
  currentIndex: number,
  matchCount: number,
  direction: 'next' | 'previous',
): number => {
  if (matchCount <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= matchCount) {
    return direction === 'next' ? 0 : matchCount - 1;
  }
  return direction === 'next'
    ? (currentIndex + 1) % matchCount
    : (currentIndex - 1 + matchCount) % matchCount;
};
