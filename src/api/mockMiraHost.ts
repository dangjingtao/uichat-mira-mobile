import type { ChatMessage, ConnectionStatus, MiraHostConfig, Session } from '../types';
import { MiraHostApi, MiraHostError } from './miraHost';
import { mockMessages, mockSessions } from '../data/mockData';
import { useHostStore } from '../store/hostStore';

let sessionIdCounter = 0;
let msgIdCounter = 0;

export class MockMiraHostClient implements MiraHostApi {
  private config: MiraHostConfig | null = null;

  configure(config: MiraHostConfig): void {
    this.config = config;
  }

  getConnectionStatus(): ConnectionStatus {
    return useHostStore.getState().connectionStatus;
  }

  async connect(): Promise<void> {
    if (!this.config) {
      throw new MiraHostError('NO_CONFIG', '未配置主机地址');
    }
    // Mock delay
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 800));
    useHostStore.getState().setConnectionStatus('connected');
  }

  async disconnect(): Promise<void> {
    useHostStore.getState().setConnectionStatus('disconnected');
  }

  async listSessions(): Promise<Session[]> {
    return mockSessions;
  }

  async getSession(sessionId: string): Promise<Session> {
    const session = mockSessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new MiraHostError('NOT_FOUND', `会话 ${sessionId} 不存在`);
    }
    return session;
  }

  async createSession(title?: string): Promise<Session> {
    const session: Session = {
      id: `session-${Date.now()}-${++sessionIdCounter}`,
      title: title ?? '新会话',
      updatedAt: new Date(),
    };
    mockSessions.unshift(session);
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const idx = mockSessions.findIndex((s) => s.id === sessionId);
    if (idx >= 0) mockSessions.splice(idx, 1);
  }

  async renameSession(sessionId: string, title: string): Promise<Session> {
    const session = mockSessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new MiraHostError('NOT_FOUND', `会话 ${sessionId} 不存在`);
    }
    session.title = title;
    session.updatedAt = new Date();
    return session;
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return mockMessages[sessionId] ?? [];
  }

  async sendMessage(
    sessionId: string,
    content: string,
  ): Promise<AsyncIterable<string>> {
    // Add user message to mock store
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${++msgIdCounter}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    if (!mockMessages[sessionId]) {
      mockMessages[sessionId] = [];
    }
    mockMessages[sessionId].push(userMsg);

    // Return mock streaming response
    const mockReply =
      '收到！这是 mock 回复。后端接好后，这里会返回真实的流式数据。';
    const words = mockReply.split('');

    async function* stream(): AsyncIterable<string> {
      for (const word of words) {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 30));
        yield word;
      }

      // Append assistant message after stream
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-${++msgIdCounter}-a`,
        role: 'assistant',
        content: mockReply,
        timestamp: new Date(),
      };
      mockMessages[sessionId].push(assistantMsg);
    }

    return stream();
  }
}

export const miraHostClient = new MockMiraHostClient();
