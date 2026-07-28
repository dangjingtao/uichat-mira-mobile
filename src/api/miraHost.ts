import type {
  ApiError,
  ChatMessage,
  ConnectionStatus,
  MiraHostConfig,
  Session,
} from '../types';

export interface MiraHostApi {
  configure(config: MiraHostConfig): void;

  getConnectionStatus(): ConnectionStatus;

  connect(): Promise<void>;

  disconnect(): Promise<void>;

  listSessions(): Promise<Session[]>;

  getSession(sessionId: string): Promise<Session>;

  createSession(title?: string): Promise<Session>;

  deleteSession(sessionId: string): Promise<void>;

  getMessages(sessionId: string): Promise<ChatMessage[]>;

  sendMessage(sessionId: string, content: string): Promise<AsyncIterable<string>>;
}

export class MiraHostError implements ApiError {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: unknown,
  ) {}
}
