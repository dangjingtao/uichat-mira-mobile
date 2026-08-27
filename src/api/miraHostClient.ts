import type {
  ChatMessage,
  ConnectionStatus,
  MiraHostConfig,
  Session,
} from '../types';
import { useHostStore } from '../store/hostStore';
import {
  remoteMiraHostClient,
  type RemoteMiraHostClient,
} from './remoteMiraHost';
import type {
  RemoteChatStreamEvent,
  RemoteMessage,
  RemoteThread,
} from '../protocol/remoteHostV1';
import { RemoteHostError } from './remoteHttp';
import type { MiraHostApi } from './miraHost';

const threadToSession = (thread: RemoteThread): Session => ({
  id: thread.id,
  title: thread.title,
  updatedAt: new Date(thread.updatedAt),
  workspaceId: thread.workspaceId,
  knowledgeBaseId: thread.knowledgeBaseId,
  roleId: thread.roleId,
  agentEnabled: thread.agentEnabled,
  status: thread.status,
});

const messageToChatMessage = (message: RemoteMessage): ChatMessage => ({
  id: message.id,
  role:
    message.role === 'tool' || message.role === 'system'
      ? 'system'
      : message.role,
  content: message.content,
  timestamp: new Date(message.createdAt),
});

const unsupportedMutation = (operation: string): never => {
  throw new Error(
    `${operation} is not available to a paired mobile device in Remote Host V1`,
  );
};

const createMessageId = () =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const toContextMessage = (message: RemoteMessage) => {
  if (message.role === 'tool') return null;

  const text =
    message.content.trim() ||
    message.parts
      .filter((part): part is Extract<typeof part, { type: 'text' }> =>
        part.type === 'text',
      )
      .map(part => part.text)
      .join('\n')
      .trim();

  if (!text) return null;

  return {
    id: message.id,
    role: message.role,
    parts: [{ type: 'text' as const, text }],
  };
};

/**
 * Mobile runtime compatibility adapter.
 *
 * The mobile app is a paired remote device. Its business identity is the
 * `mira_device_*` credential issued by Remote Host V1; it must never fall back
 * to a desktop user's username/password or JWT.
 *
 * This adapter preserves the older screen-facing MiraHostApi shape while all
 * supported operations are delegated to RemoteMiraHostClient.
 */
export class PairedRemoteMiraHostClient implements MiraHostApi {
  private currentSendAbort: (() => void) | null = null;
  private lastRuntimeEvents: Array<
    Extract<RemoteChatStreamEvent, { type: 'data-tool-event' | 'data-execution-node' }>
  > = [];

  constructor(private readonly remote: RemoteMiraHostClient) {}

  configure(_config: MiraHostConfig): void {
    // Intentionally ignored. Remote Host V1 connection details are restored
    // from the securely stored device credential, not from a user JWT config.
  }

  getConnectionStatus(): ConnectionStatus {
    return useHostStore.getState().connectionStatus;
  }

  async connect(): Promise<void> {
    useHostStore.getState().setConnectionStatus('connecting');
    try {
      const restored = await this.remote.restoreConnection();
      if (!restored) {
        useHostStore.getState().setConnectionStatus('disconnected');
        throw new Error('This mobile device is not paired with a Mira Host');
      }
      useHostStore.getState().setConnectionStatus('connected');
    } catch (error) {
      useHostStore.getState().setConnectionStatus('disconnected');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cancelCurrentSend();
    await this.remote.disconnect();
    useHostStore.getState().clearConfig();
    useHostStore.getState().setConnectionStatus('disconnected');
  }

  async listSessions(): Promise<Session[]> {
    return (await this.remote.listThreads()).map(threadToSession);
  }

  async getSession(sessionId: string): Promise<Session> {
    return threadToSession(await this.remote.getThread(sessionId));
  }

  async createSession(_title?: string): Promise<Session> {
    return unsupportedMutation('Creating a thread');
  }

  async deleteSession(_sessionId: string): Promise<void> {
    return unsupportedMutation('Deleting a thread');
  }

  async renameSession(_sessionId: string, _title: string): Promise<Session> {
    return unsupportedMutation('Renaming a thread');
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return (await this.remote.getMessages(sessionId)).map(messageToChatMessage);
  }

  async sendMessage(
    sessionId: string,
    content: string,
    messageId: string = createMessageId(),
  ): Promise<AsyncIterable<string>> {
    const stableMessageId = messageId.trim();
    if (!stableMessageId) {
      throw new Error('A stable message id is required');
    }

    const canonicalMessages = await this.remote.getMessages(sessionId);
    const contextMessages = canonicalMessages
      .filter(message => message.id !== stableMessageId)
      .map(toContextMessage)
      .filter((message): message is NonNullable<typeof message> => Boolean(message));
    contextMessages.push({
      id: stableMessageId,
      role: 'user',
      parts: [{ type: 'text', text: content }],
    });

    const session = await this.remote.sendMessage({
      threadId: sessionId,
      messageId: stableMessageId,
      content,
      messages: contextMessages,
    });
    this.lastRuntimeEvents = [];
    this.currentSendAbort = session.abort;

    const self = this;
    return (async function* () {
      let sawFinish = false;
      try {
        for await (const event of session.events) {
          if (
            (event.type === 'data-tool-event' || event.type === 'data-execution-node') &&
            event.data &&
            typeof event.data === 'object' &&
            !Array.isArray(event.data)
          ) {
            self.lastRuntimeEvents.push(
              event as Extract<
                RemoteChatStreamEvent,
                { type: 'data-tool-event' | 'data-execution-node' }
              >,
            );
            continue;
          }
          if (event.type === 'finish') {
            sawFinish = true;
            if (event.finishReason === 'error') {
              throw new RemoteHostError(
                'CHAT_FINISHED_WITH_ERROR',
                'Mira Host finished the chat with an error',
              );
            }
            if (event.finishReason !== 'stop') {
              throw new RemoteHostError(
                'INVALID_FINISH_REASON',
                `Mira Host returned unsupported finish reason: ${event.finishReason}`,
              );
            }
            continue;
          }
          if (event.type === 'text-delta' && typeof event.delta === 'string') {
            yield event.delta;
            continue;
          }
          if (event.type === 'error') {
            const errorText =
              'errorText' in event && typeof event.errorText === 'string'
                ? event.errorText
                : 'Mira Host stream failed';
            throw new RemoteHostError('CHAT_STREAM_ERROR', errorText);
          }
        }
        // [DONE] only closes the SSE reader. A successful chat must also have
        // an explicit finish event from the shared Host stream contract.
        if (!sawFinish) {
          throw new RemoteHostError(
            'CHAT_STREAM_INCOMPLETE',
            'Mira Host closed the chat stream before finish was received',
          );
        }
      } finally {
        if (self.currentSendAbort === session.abort) {
          self.currentSendAbort = null;
        }
      }
    })();
  }

  cancelCurrentSend() {
    const abort = this.currentSendAbort;
    this.currentSendAbort = null;
    abort?.();
  }

  /** Structured tool/execution events retained for a compact runtime status UI. */
  getLastRuntimeEvents() {
    return [...this.lastRuntimeEvents];
  }
}

export const miraHostClient = new PairedRemoteMiraHostClient(
  remoteMiraHostClient,
);
