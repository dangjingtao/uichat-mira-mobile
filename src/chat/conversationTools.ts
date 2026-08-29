import type { ChatMessage } from '../types';
import type { RemoteMessagePart } from '../protocol/remoteHostV1';

const isUserVisibleMessage = (message: ChatMessage) =>
  message.role === 'user' || message.role === 'assistant';

const attachmentParts = (message: ChatMessage) =>
  (message.parts ?? []).filter(
    (
      part,
    ): part is Extract<RemoteMessagePart, { type: 'image' | 'file' }> =>
      part.type === 'image' || part.type === 'file',
  );

const describeAttachment = (
  part: Extract<RemoteMessagePart, { type: 'image' | 'file' }>,
) => {
  if (part.type === 'image') {
    return part.filename ? `[图片：${part.filename}]` : '[图片]';
  }
  return `[附件：${part.filename}]`;
};

const messageSearchText = (message: ChatMessage) =>
  [
    message.content,
    ...attachmentParts(message).map((part) =>
      part.type === 'image' ? (part.filename ?? '图片') : part.filename,
    ),
  ]
    .join('\n')
    .toLocaleLowerCase();

export const buildConversationShareText = (
  messages: ChatMessage[],
  title?: string,
): string => {
  const blocks = messages
    .filter(isUserVisibleMessage)
    .map((message) => {
      const content = message.content.trim();
      const attachments = attachmentParts(message).map(describeAttachment);
      if (!content && attachments.length === 0) return null;

      const speaker = message.role === 'user' ? 'You' : 'Mira';
      return [content ? `${speaker}: ${content}` : `${speaker}:`, ...attachments].join(
        '\n',
      );
    })
    .filter((block): block is string => block !== null);

  if (blocks.length === 0) return '';

  const body = blocks.join('\n\n');
  const safeTitle = title?.trim();
  return safeTitle ? `${safeTitle}\n\n${body}` : body;
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
    if (!isUserVisibleMessage(message)) return;
    if (messageSearchText(message).includes(normalizedQuery)) {
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