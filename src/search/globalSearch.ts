import type { ChatMessage, Session } from '../types';

export type GlobalSearchStatus =
  | 'idle'
  | 'searching'
  | 'complete'
  | 'degraded'
  | 'failed';

export interface GlobalSearchMessageMatch {
  session: Session;
  message: ChatMessage;
  snippet: string;
}

export interface GlobalSearchState {
  status: GlobalSearchStatus;
  query: string;
  threadMatches: Session[];
  messageMatches: GlobalSearchMessageMatch[];
}

export interface GlobalSearchDeps {
  listSessions: () => Promise<Session[]>;
  getMessages: (sessionId: string) => Promise<ChatMessage[]>;
  onStateChange: (state: GlobalSearchState) => void;
}

/**
 * Mobile-side bounded global search. There is no canonical Host search route
 * (see docs/task-cards/MOB-026), so message bodies are fetched through the
 * existing `listSessions` + `getMessages` contracts with bounded concurrency,
 * per-thread failure isolation and stale-query invalidation.
 */
export class GlobalSearchController {
  private generation = 0;

  constructor(private readonly deps: GlobalSearchDeps) {}

  search(query: string): void {
    const trimmed = query.trim();
    const generation = ++this.generation;

    if (!trimmed) {
      this.deps.onStateChange({
        status: 'idle',
        query: '',
        threadMatches: [],
        messageMatches: [],
      });
      return;
    }

    this.deps.onStateChange({
      status: 'searching',
      query: trimmed,
      threadMatches: [],
      messageMatches: [],
    });
    void this.runSearch(trimmed, generation);
  }

  /** Invalidates any in-flight search without emitting new state. */
  dispose(): void {
    this.generation += 1;
  }

  private async runSearch(query: string, generation: number): Promise<void> {
    const needle = query.toLowerCase();

    let sessions: Session[];
    try {
      sessions = await this.deps.listSessions();
    } catch {
      if (this.generation !== generation) return;
      this.deps.onStateChange({
        status: 'failed',
        query,
        threadMatches: [],
        messageMatches: [],
      });
      return;
    }

    if (this.generation !== generation) return;

    const threadMatches = sessions.filter((session) =>
      session.title.toLowerCase().includes(needle),
    );

    const messageMatches: GlobalSearchMessageMatch[] = [];
    let failedThreads = 0;

    const queue = [...sessions];
    const worker = async (): Promise<void> => {
      for (;;) {
        if (this.generation !== generation) return;
        const session = queue.shift();
        if (!session) return;
        try {
          const messages = await this.deps.getMessages(session.id);
          if (this.generation !== generation) return;
          for (const message of messages) {
            if (message.role === 'system') continue;
            if (!message.content.toLowerCase().includes(needle)) continue;
            messageMatches.push({
              session,
              message,
              snippet: buildSnippet(message.content, needle),
            });
          }
        } catch {
          // A single unreadable thread must not clear results from the
          // threads that were searched successfully.
          failedThreads += 1;
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(MESSAGE_SEARCH_CONCURRENCY, queue.length) },
      () => worker(),
    );
    await Promise.all(workers);

    if (this.generation !== generation) return;

    messageMatches.sort((left, right) => {
      const sessionDiff =
        right.session.updatedAt.getTime() - left.session.updatedAt.getTime();
      if (sessionDiff !== 0) return sessionDiff;
      return (
        right.message.timestamp.getTime() - left.message.timestamp.getTime()
      );
    });

    this.deps.onStateChange({
      status: failedThreads > 0 ? 'degraded' : 'complete',
      query,
      threadMatches,
      messageMatches: messageMatches.slice(0, MESSAGE_MATCH_LIMIT),
    });
  }
}

export const SEARCH_DEBOUNCE_MS = 250;
const MESSAGE_SEARCH_CONCURRENCY = 4;
const MESSAGE_MATCH_LIMIT = 50;
const SNIPPET_RADIUS = 24;

export const buildSnippet = (
  content: string,
  query: string,
  radius: number = SNIPPET_RADIUS,
): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const index = normalized.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) {
    return normalized.slice(0, radius * 2);
  }
  const start = Math.max(0, index - radius);
  const end = Math.min(normalized.length, index + query.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalized.length ? '…' : '';
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
};
