export interface MiraHostConfig {
  hostUrl: string;
  token: string;
}

export interface Session {
  id: string;
  title: string;
  updatedAt: Date;
  /** Canonical Host ownership metadata. Optional for legacy mock/story sessions. */
  workspaceId?: string | null;
  knowledgeBaseId?: string | null;
  roleId?: string | null;
  agentEnabled?: boolean | null;
  status?: string;
  /** Canonical Remote Thread message count, used only as a change probe. */
  messageCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** Canonical Host metadata. Mobile must not invent or rewrite these fields. */
  metadata?: Record<string, unknown>;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
