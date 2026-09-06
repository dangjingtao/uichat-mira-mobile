import type { ChatMessage, Session } from '../types';

export type RuntimeKind = 'remote-host' | 'local-provider';

export type RuntimeEvent =
  | { type: 'text-delta'; delta: string }
  | {
      type: 'tool-call';
      callId: string;
      name: string;
      arguments: string;
    }
  | { type: 'finish'; reason: string | null }
  | { type: 'tool-result'; callId: string; name: string; content: string }
  | { type: 'run-paused'; reason: 'app-suspended' | 'timeout' | 'cancelled' }
  | { type: 'error'; message: string };

export interface ConversationRuntime {
  readonly kind: RuntimeKind;
  /** True only when the runtime has a confirmed tool gateway implementation. */
  readonly supportsAgent?: boolean;
  listSessions(): Promise<Session[]>;
  getMessages(sessionId: string): Promise<ChatMessage[]>;
  sendMessage(
    sessionId: string,
    input: string,
    options?: { agentEnabled?: boolean; messageId?: string },
  ): Promise<AsyncIterable<RuntimeEvent>>;
  cancelActiveRun(): void;
}
