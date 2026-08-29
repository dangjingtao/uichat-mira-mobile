import { Share } from 'react-native';
import type { ChatMessage } from '../types';

export type ShareOutcome = 'shared' | 'dismissed';

interface ShareContent {
  message: string;
  title?: string;
}

export type ShareSheetInvoker = (
  content: ShareContent,
) => Promise<{ action: string }>;

function isShareableMessage(message: ChatMessage): boolean {
  return message.role === 'user' || message.role === 'assistant';
}

/**
 * Share text is built only from user-visible message text. System messages,
 * message parts (files/images/data) and Host metadata are intentionally
 * excluded so credentials, Host URLs and run/tool internals can never leak
 * through the system share sheet.
 */
export function buildConversationShareText(
  title: string,
  messages: ChatMessage[],
): string {
  const body = messages
    .filter(isShareableMessage)
    .map((message) => {
      const speaker = message.role === 'user' ? 'Me' : 'Mira';
      return `${speaker}: ${message.content.trim()}`;
    })
    .filter((line) => !line.endsWith(': '));
  const header = title.trim();
  return [header, ...body].filter((line) => line.length > 0).join('\n\n');
}

/**
 * A dismissed share sheet is a normal user choice, not a failure; callers only
 * need to handle thrown errors as real share failures.
 */
export async function shareConversation(
  title: string,
  messages: ChatMessage[],
  invokeShareSheet: ShareSheetInvoker = (content) => Share.share(content),
): Promise<ShareOutcome> {
  const message = buildConversationShareText(title, messages);
  const result = await invokeShareSheet({
    message,
    title: title.trim().length > 0 ? title.trim() : undefined,
  });
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}
